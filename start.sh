#!/bin/sh

# Start cron daemon
crond -b

# Print startup message
echo "Starting HimLearning backend server..."
echo "Cron daemon started - will ping health endpoint every 3 minutes"

# Start Node.js application
node server.js 