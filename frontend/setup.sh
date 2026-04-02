#!/usr/bin/env bash
# Cadence Frontend Setup Script

echo "🎵 Cadence Frontend - Installation"
echo "=================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js/npm found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "🚀 To start the development server, run:"
    echo "   npm run dev"
    echo ""
    echo "📝 Make sure the backend is running on http://127.0.0.1:8000"
else
    echo "❌ Installation failed!"
    exit 1
fi
