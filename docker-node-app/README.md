# docker-node-app

A minimal Node.js Express app containerised using a **multi-stage Docker build**. Built as part of a 90-day DevOps learning plan (Week 2 — Docker Deep Dive).

## What this demonstrates

- Writing a `Dockerfile` with multi-stage builds
- Separating build-time dependencies from the final production image
- Reducing image size by only copying compiled output into the runner stage
- Running a containerised Node.js app locally

## Project structure

```
docker-node-app/
├── Dockerfile
├── package.json
├── package-lock.json
└── src/
    └── index.js
```

## How the multi-stage build works

| Stage | Base image | What it does |
|-------|-----------|--------------|
| `builder` | `node:20-alpine` | Installs all dependencies, copies source, runs build |
| `runner` | `node:20-alpine` | Copies only the `dist/` output — no source, no dev deps |

The key instruction that bridges the two stages:

```dockerfile
COPY --from=builder /app/dist ./dist
```

This means the final image ships none of the build tooling or `node_modules` from the builder — just the compiled output and production dependencies.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js installed locally (to generate `package-lock.json` before the first build)

## Getting started

**1. Install dependencies locally** (only needed once, to generate `package-lock.json`)

```bash
npm install
```

**2. Build the Docker image**

```bash
docker build -t docker-node-app .
```

**3. Run the container**

```bash
docker run -p 3000:3000 docker-node-app
```

**4. Open in browser**

```
http://localhost:3000
```

You should see the app responding at the root route.

## Dockerfile

```dockerfile
# Stage 1: builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: runner
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## Key concepts practised

- `FROM ... AS <name>` — naming a build stage
- `npm ci` vs `npm install` — `ci` requires a lockfile and is faster and reproducible; used in Docker builds
- `COPY --from=<stage>` — copying artefacts between stages
- `--omit=dev` — excluding devDependencies from the production image
- Layer caching — copying `package*.json` before source code so dependency installation is cached unless deps change

## Image size comparison

| Image | Approximate size |
|-------|-----------------|
| Single-stage (with node_modules) | ~600 MB |
| Multi-stage (production only) | ~80 MB |

## Useful commands

```bash
# Check image size
docker images docker-node-app

# Run in detached mode
docker run -d -p 3000:3000 docker-node-app

# View running containers
docker ps

# Stop a container
docker stop <container-id>

# Remove the image
docker rmi docker-node-app
```

## Part of

[90-day DevOps learning plan](../README.md) — Week 2: Docker Deep Dive
