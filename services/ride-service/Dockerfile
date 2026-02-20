# Multi-stage build for Ride Service
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for service
COPY services/ride-service/package*.json ./

# Copy shared package.json
COPY shared/package.json /shared/package.json

# Install dependencies for both service and shared
RUN npm install --production && \
    cd /shared && npm install --production

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy shared folder and its dependencies
COPY --from=builder /shared/node_modules /shared/node_modules
COPY shared /shared

# Copy application code
COPY services/ride-service .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app && \
    chown -R nodejs:nodejs /shared

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/index.js"]
