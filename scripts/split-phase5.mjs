import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const financesPage = fs.readFileSync(
  path.join(root, "src/app/admin/finances/page.tsx"),
  "utf8"
);
const customersPage = fs.readFileSync(
  path.join(root, "src/app/admin/customers/page.tsx"),
  "utf8"
);
const lines = financesPage.split(/\r?\n/);

function extract(sourceLines, start, end) {
  return sourceLines.slice(start - 1, end).join("\n");
}

const tabsDir = path.join(root, "src/app/admin/finances/tabs");
fs.mkdirSync(tabsDir, { recursive: true });

const tabRanges = {
  "overview-tab.tsx": [1198, 1554],
  "expenses-tab.tsx": [1561, 2000],
  "revenue-tab.tsx": [2007, 2199],
  "profit-tab.tsx": [2206, 2381],
  "vehicles-tab.tsx": [2388, 2448],
};

for (const [file, [start, end]] of Object.entries(tabRanges)) {
  const body = extract(lines, start, end);
  fs.writeFileSync(path.join(tabsDir, file), `${body}\n`);
}

fs.writeFileSync(
  path.join(root, "src/app/admin/finances/use-finances-computed.ts"),
  `${extract(lines, 134, 595)}\n`
);

fs.writeFileSync(
  path.join(root, "src/app/admin/finances/finances-vehicle-detail.tsx"),
  `${extract(lines, 858, 1041)}\n`
);

fs.writeFileSync(
  path.join(root, "src/app/admin/finances/finances-daily-revenue-view.tsx"),
  `${extract(lines, 760, 855)}\n`
);

const custLines = customersPage.split(/\r?\n/);
fs.writeFileSync(
  path.join(root, "src/app/admin/customers/customer-detail-drawer.tsx"),
  `${extract(custLines, 83, 974)}\n\n${extract(custLines, 977, 1684)}\n`
);

console.log("Extracted files.");
