// @ts-check
const { withAppBuildGradle, withInfoPlist, withSettingsGradle, withXcodeProject } = require('expo/config-plugins');

/** Prepare native release inputs for the shared gateway builder. */
module.exports = function withStoreRelease(config) {
    config = withSettingsGradle(config, (project) => {
        project.modResults.contents = project.modResults.contents.replace(/[\t ]+$/gm, '');
        return project;
    });
    config = withXcodeProject(config, (project) => {
        const configurations = project.modResults.pbxXCBuildConfigurationSection();
        for (const configuration of Object.values(configurations)) {
            const settings = configuration?.buildSettings;
            if (!settings || !settings.PRODUCT_BUNDLE_IDENTIFIER) continue;
            settings.CODE_SIGN_STYLE = 'Automatic';
            settings.MARKETING_VERSION = config.version;
            settings.CURRENT_PROJECT_VERSION = config.ios?.buildNumber ?? '1';
        }
        return project;
    });
    config = withInfoPlist(config, (project) => {
        project.modResults.CFBundleShortVersionString = '$(MARKETING_VERSION)';
        project.modResults.CFBundleVersion = '$(CURRENT_PROJECT_VERSION)';
        return project;
    });
    return withAppBuildGradle(config, (project) => {
        let source = project.modResults.contents;
        const replacements = [
            [/versionCode \d+/, 'versionCode = (System.getenv("MPRLAB_MOBILE_VERSION_CODE") ?: "1").toInteger()'],
            [/versionName "[^"]+"/, 'versionName = (System.getenv("MPRLAB_MOBILE_VERSION_NAME") ?: "1.0.0")'],
            [/signingConfigs \{/, `signingConfigs {
        release {
            def uploadKey = System.getenv("ALLERGY_WHEEL_ANDROID_KEYSTORE")
            if (uploadKey) storeFile file(uploadKey)
            storePassword System.getenv("ALLERGY_WHEEL_ANDROID_STORE_PASSWORD")
            keyAlias System.getenv("ALLERGY_WHEEL_ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ALLERGY_WHEEL_ANDROID_KEY_PASSWORD")
        }`],
            [/release \{\s*\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/, 'release {\n            signingConfig signingConfigs.release'],
            [/minifyEnabled enableMinifyInReleaseBuilds/, 'minifyEnabled true']
        ];
        for (const [pattern, replacement] of replacements) {
            if (!pattern.test(source)) throw new Error(`Native release template changed: ${pattern}`);
            source = source.replace(pattern, replacement);
        }
        source += `
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { task -> task.project == project && task.name.toLowerCase().contains("release") }) {
        ["MPRLAB_MOBILE_VERSION_NAME", "MPRLAB_MOBILE_VERSION_CODE", "ALLERGY_WHEEL_ANDROID_KEYSTORE",
         "ALLERGY_WHEEL_ANDROID_STORE_PASSWORD", "ALLERGY_WHEEL_ANDROID_KEY_ALIAS", "ALLERGY_WHEEL_ANDROID_KEY_PASSWORD"].each { name ->
            if (!System.getenv(name)?.trim()) throw new GradleException("Release requires environment " + name)
        }
    }
}
`;
        project.modResults.contents = source;
        return project;
    });
};
