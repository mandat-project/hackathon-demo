const {defineConfig} = require('@vue/cli-service')
const {vueBaseConfig} = require("../../vue.base-config");
const path = require("path");

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
        msTileColor: "#81c784",
    },
    configureWebpack: {
        resolve: {
            alias: {
            "hackathon-demo/libs/components": path.resolve(
                __dirname,
                "../../libs/components"
            ),
            "hackathon-demo/libs/composables": path.resolve(
                __dirname,
                "../../libs/composables/index.ts"
            ),
            "hackathon-demo/libs/solid": path.resolve(
                __dirname,
                "../../libs/solid/index.ts"
            ),
            "hackathon-demo/libs/utils": path.resolve(
                __dirname,
                "../../libs/utils/index.ts"
            ),
            "hackathon-demo/libs/theme/theme.css": path.resolve(
                __dirname,
                "../../libs/theme/dist/theme.css"
            ),
            },
        },
    }
});
