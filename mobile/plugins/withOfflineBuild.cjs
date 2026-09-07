// @ts-check
const { withAppBuildGradle, withMainApplication, withXcodeProject } = require('expo/config-plugins');

/** Generate native projects whose development artifacts contain their JavaScript bundle. */
module.exports = function withOfflineBuild(config) {
    config = withAppBuildGradle(config, (project) => {
        const source = project.modResults.contents;
        const expoCli = /cliFile = new File\([^\n]+\n\s*bundleCommand = "export:embed"/;
        if (!expoCli.test(source)) throw new Error('Android native bundle configuration changed.');
        project.modResults.contents = source.replace(expoCli,
            'cliFile = new File(["node", "--print", "require(\'@react-native-community/cli\').bin"].execute(null, rootDir).text.trim())\n    bundleCommand = "bundle"\n    debuggableVariants = []');
        return project;
    });
    config = withMainApplication(config, (project) => {
        const contextArgument = 'context = applicationContext,';
        if (!project.modResults.contents.includes(contextArgument)) throw new Error('Android developer support configuration changed.');
        project.modResults.contents = project.modResults.contents.replace(contextArgument, `${contextArgument}\n      useDevSupport = false,`);
        return project;
    });
    return withXcodeProject(config, (project) => {
        const phases = project.modResults.hash.project.objects.PBXShellScriptBuildPhase;
        let updatedPhase = false;
        for (const phase of Object.values(phases)) {
            if (typeof phase !== 'object' || !phase.shellScript?.includes('react-native-xcode.sh')) continue;
            // Use the native React Native bundler for artifacts; Expo remains the source-config generator.
            const script = 'export ENTRY_FILE="$PROJECT_DIR/../index.js"\nexport CLI_PATH="$PROJECT_DIR/../node_modules/react-native/scripts/bundle.js"\nexport BUNDLE_COMMAND=bundle\nexport FORCE_BUNDLING=1\nexport NODE_BINARY="$(command -v node)"\n/bin/sh "$PROJECT_DIR/../node_modules/react-native/scripts/react-native-xcode.sh"\n';
            phase.shellScript = JSON.stringify(script);
            updatedPhase = true;
        }
        if (!updatedPhase) throw new Error('iOS native bundle phase is missing.');
        return project;
    });
};
