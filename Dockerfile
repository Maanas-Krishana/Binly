# ==========================================================================
# Stage 1: Build & Compile Native Dependencies
# ==========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install native compilation dependencies required by better-sqlite3
RUN apk add --no-cache python3 make g++ gcc

# Copy dependency definition files
COPY package*.json ./

# Install all dependencies (including devDependencies if needed for build)
RUN npm ci

# ==========================================================================
# Stage 2: Production Runtime Environment
# ==========================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/binly.db

# Create directory for persistent SQLite database storage
RUN mkdir -p /data

# Copy built node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy application source files
COPY . .

# Expose production port
EXPOSE 3000

# Start Binly application
CMD ["node", "server.js"]
