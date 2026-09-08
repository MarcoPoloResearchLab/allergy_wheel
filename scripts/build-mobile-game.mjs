// @ts-check
import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'mobile/generated');
const mimeTypes = Object.freeze({ '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg' });
const resources = new Map();

/** Read an owned local asset and represent its exact bytes in the mobile document. */
async function embedResource(resourcePath) {
    const normalizedPath = resourcePath.replace(/^\.?\//, '');
    const absolutePath = resolve(root, normalizedPath);
    if (!absolutePath.startsWith(`${root}/assets/`) && !absolutePath.startsWith(`${root}/data/`)) {
        throw new Error(`Mobile resource is outside the game: ${resourcePath}`);
    }
    if (!resources.has(normalizedPath)) {
        const bytes = await readFile(absolutePath);
        const mimeType = mimeTypes[extname(absolutePath)];
        if (!mimeType) throw new Error(`Unsupported mobile resource: ${resourcePath}`);
        if (mimeType === mimeTypes['.json']) JSON.parse(bytes.toString('utf8'));
        resources.set(normalizedPath, { uri: `data:${mimeType};base64,${bytes.toString('base64')}`, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    return resources.get(normalizedPath).uri;
}

/** Replace resource literals while leaving browser source files unchanged. */
async function embedLiterals(source) {
    const matches = [...source.matchAll(/(["'])(\.?\/?(?:assets|data)\/[^"']+)\1/g)];
    let result = source;
    for (const match of matches) result = result.replaceAll(match[0], JSON.stringify(await embedResource(match[2])));
    return result;
}

const bundle = await build({
    absWorkingDir: root,
    entryPoints: ['js/core/app.js'],
    bundle: true,
    write: false,
    format: 'iife',
    target: ['safari16.4', 'chrome107'],
    plugins: [{
        name: 'packaged-game-resources',
        setup(builder) {
            builder.onLoad({ filter: /\/js\/core\/runtime\.js$/ }, () => ({ contents: 'export const runtimeSurface = "mobile";', loader: 'js' }));
            builder.onLoad({ filter: /\/js\/constants\.js$/ }, async ({ path }) => ({ contents: await embedLiterals(await readFile(path, 'utf8')), loader: 'js' }));
        }
    }]
});
let html = await readFile(resolve(root, 'index.html'), 'utf8');
// Mobile analytics has its own document; feedback retains its parent entry point.
html = html.replace(/\s*<!-- Google tag[\s\S]*?(?=\s*<meta content="Marco Polo)/, '');
html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
html = html.replace('<link rel="stylesheet" href="/assets/css/main.css">', `<style>${await readFile(resolve(root, 'assets/css/main.css'), 'utf8')}</style>`);
html = html.replace('<button class="ghost" id="fs">Full Screen</button>', '');
html = await embedLiterals(html);
const scriptData = Buffer.from(bundle.outputFiles[0].contents).toString('base64');
html = html.replace('<script src="js/core/app.js" type="module"></script>', `<script src="data:text/javascript;base64,${scriptData}"></script>`);
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'game.html'), html);
await writeFile(resolve(output, 'game.json'), JSON.stringify({ html }));
await writeFile(resolve(output, 'resources.json'), JSON.stringify({ documentSha256: createHash('sha256').update(html).digest('hex'), resources: [...resources].map(([path, resource]) => ({ path, sha256: resource.sha256 })) }, null, 2));
const parentBundle = await build({ absWorkingDir: root, entryPoints: ['js/core/parentsApp.js'], bundle: true, write: false, format: 'iife', target: ['safari16.4', 'chrome107'] });
const parentScript = Buffer.from(parentBundle.outputFiles[0].contents).toString('base64');
const parentHtml = (await readFile(resolve(root, 'mobile/parents.html'), 'utf8')).replace('<!-- parent-entry -->', `<script src="data:text/javascript;base64,${parentScript}"></script>`);
await writeFile(resolve(output, 'parents.html'), parentHtml);
await writeFile(resolve(output, 'parents.json'), JSON.stringify({ html: parentHtml }));
console.info(`Packaged ${resources.size} game resources in ${Buffer.byteLength(html)} bytes.`);

const analyticsBundle = await build({ absWorkingDir: root, entryPoints: ['js/core/analyticsApp.js'], bundle: true, write: false, format: 'iife', target: ['safari16.4', 'chrome107'] });
const analyticsScript = Buffer.from(analyticsBundle.outputFiles[0].contents).toString('base64');
const analyticsHtml = `<!doctype html><html><head><meta name="referrer" content="no-referrer"></head><body><script src="data:text/javascript;base64,${analyticsScript}"></script></body></html>`;
await writeFile(resolve(output, 'analytics.html'), analyticsHtml);
await writeFile(resolve(output, 'analytics.json'), JSON.stringify({ html: analyticsHtml }));
