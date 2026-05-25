# Use Node.js LTS Alpine for smaller image size
FROM node:18-alpine
# Set working directory
WORKDIR /app
# Copy package files first (for better Docker layer caching)
COPY package*.json ./
# Install production dependencies only
RUN npm ci --omit=dev --legacy-peer-deps
# Copy the rest of the application
COPY . .
# Expose the port your app runs on
EXPOSE 5000
# Set environment to production
ENV NODE_ENV=production
# Start the application
CMD ["node", "server.js"]