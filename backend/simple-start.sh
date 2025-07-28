#!/bin/sh
echo "Simple start script running..."
cd /app

# Just run the app without migrations
exec node src/app.js 2>&1 | tee /app/logs/startup.log