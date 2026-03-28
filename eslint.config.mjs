// Root ESLint config — applies to all TypeScript workspaces
// Each app/service can extend this or override locally.
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base recommended rules
  ...tseslint.configs.recommended,

  {
    rules: {
      // Enforce no implicit any
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Prefer type imports
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      // No non-null assertions in production code
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },

  {
    // Ignore build artifacts and deps
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.config.{js,mjs,cjs}",
      "**/*.d.ts",
    ],
  },
);
