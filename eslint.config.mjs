import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Plain typescript-eslint flat config — see the sibling Lead Magnet project
// for why eslint-config-next's FlatCompat shim is skipped at these versions.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["node_modules/**", ".next/**"],
  },
);
