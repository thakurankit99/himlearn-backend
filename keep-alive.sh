#!/bin/sh

# Script to ping the health endpoint to keep the server alive
# This is executed by cron every 3 minutes

# Health endpoint URL
HEALTH_URL="https://himlearnings.ankit.news/api/health"

# Current timestamp for logging
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Make the request and capture the response
RESPONSE=$(curl -s "$HEALTH_URL")

# Log the ping (uncomment for debugging)
# echo "[$TIMESTAMP] Ping to $HEALTH_URL: $RESPONSE" >> /usr/src/app/logs/keep-alive.log

# Exit with success
exit 0 