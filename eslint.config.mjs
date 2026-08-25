import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Plain typescript-eslint flat config — see the sibling Lead Magnet project
// for why eslint-config-next's FlatCompat shim is skipped at these versions.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["node_modules/**", ".next/**", "out/**"],
  },
  {
    // Node-only config files (next.config.mjs, postcss.config.mjs, this
    // file) run under Node, not the browser — they need `process` etc.
    // recognized as a real global instead of triggering no-undef.
    files: ["*.config.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
);
