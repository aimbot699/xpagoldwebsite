# Use Node.js 22 as the base image
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 1: Build the application
FROM base AS builder
WORKDIR /app

# Copy workspace configuration and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# Copy all packages
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY tsconfig.base.json tsconfig.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Set environment variables for build
ENV NODE_ENV=production
ENV BASE_PATH=/
ENV PORT=8080

# Build the project
RUN pnpm --filter @workspace/gold-tracker --filter @workspace/api-server run build

# Stage 2: Production image
FROM base AS runner
WORKDIR /app

# Copy all files from builder to preserve pnpm workspace symlinks
COPY --from=builder /app .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the backend server
CMD ["node", "artifacts/api-server/dist/index.mjs"]
