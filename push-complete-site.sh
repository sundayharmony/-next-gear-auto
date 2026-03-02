#!/bin/bash
# Run this from your Mac terminal (NOT Cursor)
# This will push ALL 24 routes (Phases 1-4) to your GitHub repo

set -e

echo "=== Pushing Complete NextGearAuto Site to GitHub ==="

# 1. Clone fresh
rm -rf /tmp/nga-push
mkdir /tmp/nga-push
cd /tmp/nga-push

git clone https://github.com/sundayharmony/-next-gear-auto.git .
git config user.email "sales@sundayharmony.com"
git config user.name "MC"

# 2. Remove everything except .git
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +

# 3. Extract the complete project from the tarball
# Adjust this path to wherever your "NGA website" folder is
TARBALL="$HOME/NGA website/next-gear-auto-complete.tar.gz"

if [ ! -f "$TARBALL" ]; then
  # Try common paths
  for trypath in \
    "$HOME/Desktop/NGA website/next-gear-auto-complete.tar.gz" \
    "$HOME/Documents/NGA website/next-gear-auto-complete.tar.gz" \
    "$HOME/Downloads/NGA website/next-gear-auto-complete.tar.gz"; do
    if [ -f "$trypath" ]; then
      TARBALL="$trypath"
      break
    fi
  done
fi

if [ ! -f "$TARBALL" ]; then
  echo "ERROR: Could not find next-gear-auto-complete.tar.gz"
  echo "Please find it in your 'NGA website' folder and run:"
  echo "  cd /tmp/nga-push && tar xzf /path/to/next-gear-auto-complete.tar.gz"
  echo "  Then: git add -A && git commit -m 'feat: complete site with all 24 routes' && git push origin main --force"
  exit 1
fi

echo "Found tarball at: $TARBALL"
tar xzf "$TARBALL"

# 4. Verify structure
echo ""
echo "Root files:"
ls -1
echo ""
echo "Pages found:"
find src/app -name "page.tsx" -o -name "route.ts" | sort
echo ""

if [ ! -f "package.json" ] || [ ! -d "src" ]; then
  echo "ERROR: Missing package.json or src/ directory"
  exit 1
fi

PAGE_COUNT=$(find src/app -name "page.tsx" | wc -l)
echo "Total pages: $PAGE_COUNT (should be 14)"
echo ""

# 5. Stage and commit
git add -A
git commit -m "feat: complete site with all 24 routes (Phases 1-4)

Includes: Homepage, Fleet, Vehicle Detail, About, Location, FAQ,
Blog, Blog Post, Login, Signup, Booking (7-step), Account Dashboard,
plus 4 API routes.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo ""
echo "Ready to force push. This will REPLACE the current GitHub repo."
read -p "Continue? (y/n): " confirm
if [ "$confirm" = "y" ]; then
  git push origin main --force
  echo ""
  echo "=== Done! All 24 routes pushed to GitHub ==="
  echo "Vercel will auto-deploy. Check https://vercel.com for build status."
else
  echo "Aborted. Repo is ready at /tmp/nga-push/"
  echo "Run: cd /tmp/nga-push && git push origin main --force"
fi
