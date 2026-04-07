# docker-projects

# Docker Home Lab – Day Progress

## 📂 Project Setup
- Created a new folder: `docker-home-lab`
- Added the following files:
  - `Dockerfile`
  - `index.js` (simple Node.js HTTP server)
  - `package.json`

---

## 🛠️ Build & Run

### Build the image
```bash
docker build -t docker-home-lab .
```

### Run the container
```bash
docker run -p 3000:3000 docker-home-lab
```

Visit `http://localhost:3000` to see:
```
Hello from Docker!
```

---

## 📜 Logging & Verification
- Initially, no logs appeared because the server had no `console.log` statements.
- Updated `index.js` to include startup and request logs:
  ```js
  const http = require('http');
  const PORT = 3000;

  http.createServer((req, res) => {
    console.log(`Request received: ${req.method} ${req.url}`);
    res.end('Hello from Docker!');
  }).listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  ```
- Verified logs with:
  ```bash
  docker logs <container_id>
  ```

---

## 🔧 Troubleshooting Notes
- **Port already allocated**  
  Stopped and removed old containers:
  ```bash
  docker ps -a
  docker stop <container_id>
  docker rm <container_id>
  ```
  Or used a different port mapping:
  ```bash
  docker run -p 4000:3000 docker-home-lab
  ```

- **Detached mode**  
  To keep the container running in background:
  ```bash
  docker run -d -p 3000:3000 docker-home-lab
  ```

- **Container cleanup**  
  ```bash
  docker container prune
  ```

---

## ✅ Today’s Achievements
- Built and ran a Dockerized Node.js app.  
- Solved port conflicts and container management issues.  
- Added logging for visibility.  
- Documented the workflow for reproducibility.  

---

## 📌 Next Steps (per 90‑day plan)
- Push this repo to GitHub with clean commit messages.  
- Add screenshots of browser output and logs.  
- Extend deployment to cloud (AWS ECS, Azure Web App for Containers, GCP Cloud Run).  
```
Would you like me to also prepare a **commit message template** (like `feat: add docker-home-lab setup and troubleshooting notes`) so your GitHub history looks professional and consistent?
