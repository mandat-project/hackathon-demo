const {defineConfig} = require('@vue/cli-service')

const vueBaseConfig = defineConfig({
    publicPath: process.env.NODE_ENV === "production" ? process.env.APP_BASE_PATH : "/",
});

module.exports = {
    vueBaseConfig
}

