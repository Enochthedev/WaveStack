import tseslint from "typescript-eslint";

export default tseslint.config(
  tseslint.configs.recommended,
  {
    rules: {
      // Allow `any` with a warning — strict where it matters but not blocking
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars: error except for args prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Require explicit return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Prefer `const` assertions and avoid non-null where possible
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.config.*"],
  },
);
