#!/bin/bash
# School Uniform Ops - Launch Server & Browser
# Double-click this file to start the server and open the app in Chrome

# Set custom Node.js path
export PATH="/Users/michael/.gemini/antigravity/brain/d1926ae3-74d4-4f1a-b5f6-ac761e8f2e7b/node_dist/node-v22.13.1-darwin-arm64/bin:$PATH"

# Navigate to the app directory
cd "/Users/michael/Desktop/School Uniform Solutions/ops-app"

# Start the dev server in the background
npm run dev &

# Wait for server to start (adjust if needed)
sleep 4

# Open Chrome to localhost
open -a "Google Chrome" "http://localhost:3000"

# Keep terminal open to show server logs
echo ""
echo "=========================================="
echo "  School Uniform Ops Server Running"
echo "  Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

# Wait for the background process
wait
