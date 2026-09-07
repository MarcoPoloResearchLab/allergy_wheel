// @ts-check
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { execFileSync } from "node:child_process";

/** @param {string} directory */
async function collectFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nestedFiles = await Promise.all(entries.map(async (entry) => {
        const entryPath = join(directory, entry.name);
        if (["node_modules", "generated", "android", "ios", ".expo"].includes(entry.name)) return [];
        return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
    }));
    return nestedFiles.flat();
}

const sourceFiles = (await Promise.all(
    ["js", "scripts", "tests", "data", "mobile"].map(collectFiles)
)).flat();
sourceFiles.push("package.json", "package-lock.json");

let checkedFiles = 0;
for (const filePath of sourceFiles) {
    const extension = extname(filePath);
    if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
        execFileSync(process.execPath, ["--check", filePath], { stdio: "inherit" });
        checkedFiles += 1;
    } else if (extension === ".json") {
        try {
            JSON.parse(await readFile(filePath, "utf8"));
        } catch (error) {
            throw new Error(`Cannot validate JSON file ${filePath}.`, { cause: error });
        }
        checkedFiles += 1;
    }
}

console.log(`Validated syntax in ${checkedFiles} JavaScript and JSON files.`);
