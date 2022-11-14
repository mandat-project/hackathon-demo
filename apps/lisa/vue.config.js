const {defineConfig} = require("@vue/cli-service");
const {vueBaseConfig} = require("../../vue.base-config");


module.exports = defineConfig({
    ...vueBaseConfig,
    outputDir: '../../dist/lisa',
    devServer: {
        port: 8081
    },
    pwa: {
        workboxPluginMode: "InjectManifest",
        workboxOptions: {
            swSrc: "./src/service-worker.js",
        },
        msTileColor: "#81c784",
    },
});
