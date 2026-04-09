# Stage 1 -- Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first (Docker caches at this level)
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app (copies src --> dist here; in real projects this runs tsc/webpack/vite.etc)
RUN npm run build

# Stage 2 -- Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy production  deps manifest, then install --omit-dev
COPY package*.json ./
RUN npm ci --omit=dev

# Pull ONLY the built output from the builder stage - nothing else comes across
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]