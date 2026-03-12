# Use Node.js 20 Alpine for smaller size
FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1

# Install pnpm globally
RUN npm install -g pnpm

# Create non-root user and group
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Precreate writable dirs and set ownership
RUN mkdir -p /app/.next /app/node_modules && chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Run the application with hot-reload for development
CMD ["pnpm", "dev"]
