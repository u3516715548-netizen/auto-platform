import tseslint from "typescript-eslint";

/**
 * Shared ESLint flat config for TypeScript packages in the monorepo.
 * Consumed via relative import from the repo root (see root eslint.config.mjs).
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/.expo/**",
      "**/drizzle/**",
      "**/*.tsbuildinfo",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
);
