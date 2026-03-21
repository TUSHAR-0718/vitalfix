#!/bin/bash
cd "$(dirname "$0")"
echo "📦 Installing dependencies..."
npm install
echo ""
echo "🚀 Starting dev server..."
npm run dev
