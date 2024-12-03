const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  outputDir: "../../dist/auth",
  devServer: {
    port: 8084,
  },
});
