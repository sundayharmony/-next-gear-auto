import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const HOOK_PATTERN = /\b(useMemo|useCallback|useEffect|useState|useRef|useContext|useReducer|useLayoutEffect)\s*\(/g;
const REACT_MODULE_IMPORT = /from\s+["']react["']/;

function usedHookNames(source) {
  const names = new Set();
  for (const match of source.matchAll(HOOK_PATTERN)) {
    names.add(match[1]);
  }
  HOOK_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(
    /\bReact\.(useMemo|useCallback|useEffect|useState|useRef|useContext|useReducer|useLayoutEffect)\s*\(/g
  )) {
    names.add(match[1]);
  }
  return [...names];
}

function hasValidReactHookImports(source) {
  if (!REACT_MODULE_IMPORT.test(source)) return false;

  const usedHooks = usedHookNames(source);
  if (usedHooks.length === 0) return true;

  const hasReactDefault = /import\s+React(?:\s*,|\s+from)/.test(source);

  // import React, { hooks } from "react"
  const combo = source.match(/import\s+React\s*,\s*\{([^}]+)\}\s+from\s+["']react["']/);
  if (combo) {
    const names = combo[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
    return usedHooks.every((hook) => names.includes(hook) || hasReactDefault);
  }

  // Named imports only
  const namedMatch = source.match(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']react["']/);
  if (namedMatch) {
    const names = namedMatch[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
    return usedHooks.every((hook) => names.includes(hook));
  }

  // Default React namespace only
  if (/import\s+React\s+from\s+["']react["']/.test(source)) {
    return usedHooks.every((hook) =>
      new RegExp(`\\bReact\\.${hook}\\s*\\(`).test(source)
    );
  }

  return false;
}

const SCAN_DIRS = [
  "src/lib/hooks",
  "src/app/admin",
  "src/app/manager",
  "src/app/owner",
  "src/components/staff",
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(abs, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(abs);
    }
  }
  return acc;
}

for (const rel of SCAN_DIRS) {
  const files = walk(path.join(root, rel));
  for (const abs of files) {
    const source = fs.readFileSync(abs, "utf8");
    if (!HOOK_PATTERN.test(source)) continue;
    HOOK_PATTERN.lastIndex = 0;

    if (!hasValidReactHookImports(source)) {
      failures.push(
        `${path.relative(root, abs)}: uses React hooks but missing import from "react"`
      );
    }
  }
}

if (failures.length > 0) {
  console.error("React hook import check failed:");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("React hook import check passed.");
