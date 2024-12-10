const { defineConfig } = require("@vue/cli-service");
const path = require("path");
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  outputDir: "../../dist/auth",
  devServer: {
    port: 8084,
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
  },
});
