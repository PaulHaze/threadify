import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

const baseConfig = {
  name: "Base Configuration",
  languageOptions: {
    ecmaVersion: "latest",
    globals: {
      ...globals.node,
    },
  },
};

const tsConfig = {
  name: "Typescript Config",
  files: ["src/**/*.ts"],
  extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
  languageOptions: {
    parserOptions: {
      project: "./tsconfig.json",
    },
  },
  rules: {},
};

export default tseslint.config(baseConfig, tsConfig, eslintConfigPrettier, {
  ignores: ["node_modules/*", "dist/*"],
});
