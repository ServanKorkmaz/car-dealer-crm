#!/bin/bash

echo "Starting ForhandlerPRO Admin Portal..."
echo "======================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "Building frontend..."
    npm run build
fi

# Start the server
echo "Starting server on port 3001..."
npm start