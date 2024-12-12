const { defineConfig } = require("@vue/cli-service");
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
  },
});
