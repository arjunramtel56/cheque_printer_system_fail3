import tseslint from "typescript-eslint";
import js from "@eslint/js";

export default tseslint.config(
  {
    ignores: ["node_modules/*", "node_modules", ".next", "dist", "build"],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ...tseslint.configs.recommended,
    languageOptions: {
      parserOptions: {
        project: "tsconfig.json",
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  }
);
