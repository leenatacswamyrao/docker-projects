Docker Multi-Container Project

This project demonstrates a Node.js web application running with PostgreSQL using Docker Compose.

🚀 Getting Started

Prerequisites

Docker installed (v20+ recommended)

Docker Compose installed (v2+ recommended)

Build and Run

docker-compose up -d --build
docker-compose ps

Web app: http://localhost:4000

Database: localhost:5000 (host), db:5432 (inside Docker network)

📂 Project Structure

project-root/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── app/
    ├── package.json
    ├── package-lock.json
    └── index.js

🛠️ Common Errors & Handling

1. services.db.environment.[0]: unexpected type map[string]interface {}

Cause: Mixing list and map syntax in environment. Fix: Use one style consistently:

environment:
  POSTGRES_USER: user
  POSTGRES_PASSWORD: pass
  POSTGRES_DB: mydb

2. services.web.ports must be an array

Cause: Ports not defined as a list. Fix:

ports:
  - "4000:4000"

3. service "web" is not running

Cause: Container exited immediately. Fix: Add a Dockerfile with a CMD to run your app.

4. Cannot find module 'express'

Cause: node_modules overwritten by volume mount. Fix: Remove volumes: from web service and rebuild.

5. Exited (1) with missing dependencies

Cause: Dependencies not installed inside container. Fix: Ensure Dockerfile copies package.json and runs npm install before copying app code.

🧰 Useful Commands

Stop and remove containers:

docker-compose down

Rebuild and restart:

docker-compose up -d --build

View logs:

docker logs docker-multicontainer-compose-web-1

Connect to Postgres:

docker-compose exec db psql -U user -d mydb

✅ Best Practices

Use .dockerignore to exclude node_modules and logs.

Bake dependencies into the image for reproducibility.

Keep volumes: only for persistent data (like Postgres).

Document port mappings clearly for recruiters and collaborators.

📌 Summary

This setup ensures:

Node.js app runs on port 4000

PostgreSQL runs on port 5000 externally, 5432 internally

Dependencies are installed during build

Containers start cleanly without manual intervention
