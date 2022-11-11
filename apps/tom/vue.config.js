const {defineConfig} = require('@vue/cli-service')
const {vueBaseConfig} = require("../../vue.base-config");

module.exports = defineConfig({
    ...vueBaseConfig,
    outputDir: '../../dist/tom',
});
