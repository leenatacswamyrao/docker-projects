# Stage 1 - Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2 - Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .
RUN adduser -D appuser
USER appuser
EXPOSE 3000
CMD ["node", "index.js"]