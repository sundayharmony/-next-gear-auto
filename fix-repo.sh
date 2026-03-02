#!/bin/bash
# Run this script from your computer's terminal (NOT Cursor)
# It will clone, restructure, and force push the correct repo

set -e

echo "=== Fixing NextGearAuto GitHub Repo ==="

# 1. Clone fresh into a temp dir
rm -rf /tmp/nga-fix
mkdir /tmp/nga-fix
cd /tmp/nga-fix

# 2. Clone the repo
git clone https://github.com/sundayharmony/-next-gear-auto.git .
git config user.email "sales@sundayharmony.com"
git config user.name "MC"

# 3. Remove EVERYTHING except .git
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +

# 4. Copy the correct project files (adjust this path to where your workspace is)
# On Mac, this is typically under your selected folder
WORKSPACE="$HOME"  # Change this if needed

echo ""
echo "Looking for next-gear-auto files..."

# Try to find the source files
if [ -d "./next-gear-auto/src" ]; then
  # Files are nested in subfolder in the clone
  cp -r ./next-gear-auto/* .
  cp -r ./next-gear-auto/.* . 2>/dev/null || true
  rm -rf ./next-gear-auto
elif [ -d "../next-gear-auto/src" ]; then
  cp -r ../next-gear-auto/* .
  cp -r ../next-gear-auto/.* . 2>/dev/null || true
fi

echo ""
echo "Root files should be:"
ls -1
echo ""

# 5. Verify structure is correct
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
  echo "ERROR: Structure doesn't look right. package.json or src/ missing at root."
  echo "Please manually copy your next-gear-auto project files to /tmp/nga-fix/"
  exit 1
fi

# 6. Stage everything and force push
git add -A
git commit -m "fix: restructure repo - all project files at root

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo ""
echo "Ready to force push. This will REPLACE the GitHub repo contents."
read -p "Continue? (y/n): " confirm
if [ "$confirm" = "y" ]; then
  git push origin main --force
  echo ""
  echo "=== Done! Repo has been fixed. ==="
  echo "Vercel should auto-deploy now."
else
  echo "Aborted. The fixed repo is at /tmp/nga-fix/"
  echo "You can manually: cd /tmp/nga-fix && git push origin main --force"
fi
