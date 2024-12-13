const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  outputDir: process.env.npm_package_config_monorepo
    ? "../../dist/auth"
    : "./dist",
  devServer: {
    port: process.env.npm_package_config_port ?? 8084,
  },
});
