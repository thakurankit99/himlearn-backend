FROM node:18-alpine

# Install cron and curl
RUN apk add --no-cache curl dcron

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Bundle app source
COPY . .

# Make scripts executable
RUN chmod +x /usr/src/app/start.sh
RUN chmod +x /usr/src/app/keep-alive.sh

# Create cron file
RUN echo "*/3 * * * * /usr/src/app/keep-alive.sh" > /etc/crontabs/root

# Create logs directory
RUN mkdir -p /usr/src/app/logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["/usr/src/app/start.sh"] 