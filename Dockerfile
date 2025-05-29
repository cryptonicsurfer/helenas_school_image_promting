# Dockerfile
FROM node:22-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean any existing node_modules and package-lock
RUN rm -rf node_modules package-lock.json

# Install dependencies (will rebuild native modules for correct architecture)
RUN npm install --omit=dev && npm cache clean --force

# Copy source code (go back to simple approach but with good .dockerignore)
COPY . .

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create directories and set permissions
RUN mkdir -p /app/data /app/public/images
RUN chown -R nextjs:nodejs /app

# Build the application
RUN npm run build

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]