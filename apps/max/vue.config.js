const {defineConfig} = require('@vue/cli-service')
const {vueBaseConfig} = require("../../vue.base-config");


module.exports = defineConfig({
    ...vueBaseConfig,
    outputDir: '../../dist/max',
    devServer: {
        port: 8082
    },
    pwa: {
        workboxPluginMode: "InjectManifest",
        workboxOptions: {
            swSrc: "./src/service-worker.js",
        },
        short_name: "Max PWA",
        name: "Max PWA",
        start_url: "./",
        display: "standalone",
        themeColor: "#1f2d40",
        msTileColor: "#81c784",
        manifestOptions: {
            background_color: "#1f2d40",
        },
    },
});
