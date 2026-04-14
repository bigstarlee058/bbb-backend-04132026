# Use the official Node.js 18 image as the base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5004

# Health check
# HEALTHCHECK --interval=30s --timeout=3s \
#   CMD wget --no-verbose --tries=1 --spider http://localhost:5004/healthz || exit 1

# Command to run the application
CMD ["node", "server.js"]
