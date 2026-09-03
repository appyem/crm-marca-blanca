import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat(__dirname);

export default [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Desactivamos esta regla porque cargar datos al montar es un patrón estándar
      "react-hooks/set-state-in-effect": "off",
      // Mantenemos otras reglas de React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];