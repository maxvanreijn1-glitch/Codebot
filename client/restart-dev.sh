#!/usr/bin/env bash
# Clears Vite/build caches and restarts the dev server with a clean slate.
set -e

echo "==> Clearing Vite cache..."
rm -rf node_modules/.vite

echo "==> Clearing dist..."
rm -rf dist

echo "==> Installing dependencies..."
npm install

echo "==> Starting dev server..."
npm run dev
