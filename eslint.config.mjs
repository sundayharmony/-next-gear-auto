import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      "react-hooks/rules-of-hooks": "error",
      // Valid patterns (URL sync, theme mount, data fetch on open) — too noisy as errors project-wide
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts"]),
]);
