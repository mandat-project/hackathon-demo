const { defineConfig } = require("@vue/cli-service");
const path = require("path");

module.exports = defineConfig({
  lintOnSave: false,
  css: { extract: false },
  configureWebpack: {
    externals: {
      vue: "vue",
      n3: "n3",
      jose: "jose",
      axios: "axios",
    },
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
      },
    },
  },
});
