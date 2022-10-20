module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    "plugin:vue/vue3-essential",
    //"prettier/vue",
    // "plugin:prettier/recommended",
    "@vue/typescript",
    "plugin:@typescript-eslint/eslint-recommended",
    // "plugin:@typescript-eslint/recommended",
    //'prettier/@typescript-eslint',
  ],
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
  },
  //plugins: ["prettier"],
  rules: {
    // "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    // "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    // "vue/component-name-in-template-casing": ["error", "PascalCase"],
    'vue/multi-word-component-names': 0
  },
};
