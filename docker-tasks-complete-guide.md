 # Docker Tasks Guide - April 8-10
## Complete Guide for Leenata's 90-Day Plan

---

## Task 1: Container Logging with Elastic Stack
### Ship Docker logs to Elasticsearch via Filebeat → Explore in Kibana

### Overview
Set up a complete logging pipeline: Docker containers → Filebeat → Elasticsearch → Kibana

### Prerequisites
- Docker & Docker Compose installed
- At least 4GB RAM available for Elastic stack

---

### Step 1: Create Project Structure

```bash
mkdir -p ~/docker-logging-lab/{filebeat,apps}
cd ~/docker-logging-lab
```

---

### Step 2: Create Sample Application

Create a simple app that generates logs:

**File: `apps/app.py`**
```python
import time
import logging
import random

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger('sample-app')

def main():
    logger.info("Application started")
    
    actions = [
        "User login successful",
        "Data processing completed",
        "API request received",
        "Database query executed",
        "Cache hit",
        "Warning: High memory usage detected",
        "Error: Connection timeout",
        "Info: Scheduled task completed"
    ]
    
    while True:
        action = random.choice(actions)
        
        if "Error" in action:
            logger.error(action)
        elif "Warning" in action:
            logger.warning(action)
        else:
            logger.info(action)
        
        time.sleep(random.randint(2, 8))

if __name__ == "__main__":
    main()
```

**File: `apps/Dockerfile`**
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY app.py .
CMD ["python", "-u", "app.py"]
```

---

### Step 3: Configure Filebeat

**File: `filebeat/filebeat.yml`**
```yaml
filebeat.inputs:
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    processors:
      - add_docker_metadata:
          host: "unix:///var/run/docker.sock"

processors:
  - add_cloud_metadata: ~
  - add_host_metadata: ~
  - decode_json_fields:
      fields: ["message"]
      target: "json"
      overwrite_keys: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  indices:
    - index: "docker-logs-%{+yyyy.MM.dd}"

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
```

---

### Step 4: Create Docker Compose Configuration

**File: `docker-compose.yml`**
```yaml
version: '3.8'

services:
  # Sample Application
  app1:
    build: ./apps
    container_name: sample-app-1
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  app2:
    build: ./apps
    container_name: sample-app-2
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Elasticsearch
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
      - xpack.security.http.ssl.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - esdata:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Kibana
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      elasticsearch:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:5601/api/status || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Filebeat
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    container_name: filebeat
    user: root
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - fbdata:/usr/share/filebeat/data
    command: filebeat -e -strict.perms=false
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped

volumes:
  esdata:
    driver: local
  fbdata:
    driver: local
```

---

### Step 5: Launch the Stack

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f filebeat
docker-compose logs -f app1
```

---

### Step 6: Verify Elasticsearch is Receiving Logs

```bash
# Wait 30-60 seconds for logs to flow, then check
curl http://localhost:9200/_cat/indices?v

# You should see indices like: docker-logs-2026.04.09

# View sample documents
curl http://localhost:9200/docker-logs-*/_search?pretty&size=5
```

---

### Step 7: Explore Logs in Kibana

1. **Access Kibana**: Open http://localhost:5601 in your browser

2. **Create Index Pattern**:
   - Navigate to: **Menu (☰) → Stack Management → Index Patterns**
   - Click **Create index pattern**
   - Index pattern name: `docker-logs-*`
   - Click **Next step**
   - Time field: `@timestamp`
   - Click **Create index pattern**

3. **View Logs**:
   - Navigate to: **Menu (☰) → Discover**
   - Select your `docker-logs-*` index pattern
   - You should see logs streaming from your containers!

4. **Explore Features**:
   - Filter by container name: `container.name: "sample-app-1"`
   - Search for errors: `log.level: "ERROR"` or `message: *error*`
   - Create visualizations and dashboards

---

### Step 8: Test and Document

```bash
# Generate an error in the app
docker exec sample-app-1 python -c "import logging; logging.error('Test error from container')"

# Watch logs in Kibana (should appear within seconds)

# Take screenshots for documentation:
# 1. Kibana Discover view with logs
# 2. Filter results by container
# 3. Log details showing Docker metadata
```

---

### Step 9: Clean Up (when done testing)

```bash
# Stop services
docker-compose down

# Remove volumes (if you want to start fresh)
docker-compose down -v
```

---

## Task 2: Docker Hub - Push/Pull Private Images
### Manage private container registry

### Step 1: Create Docker Hub Account

1. Go to https://hub.docker.com/
2. Sign up for free account (if you don't have one)
3. Verify your email

---

### Step 2: Create a Private Repository

1. Log in to Docker Hub
2. Click **Create Repository**
3. Repository name: `docker-learning-lab` (or your choice)
4. Visibility: **Private**
5. Description: "Practice repository for 90-day plan"
6. Click **Create**

---

### Step 3: Login to Docker Hub from CLI

```bash
# Login (you'll be prompted for username and password)
docker login

# You should see: "Login Succeeded"

# Your credentials are stored in ~/.docker/config.json
```

---

### Step 4: Build and Tag an Image

```bash
# Build the sample app image
cd ~/docker-logging-lab/apps
docker build -t sample-logging-app .

# Tag it for your Docker Hub repository
# Format: docker tag <image> <dockerhub-username>/<repo-name>:<tag>
docker tag sample-logging-app YOUR_USERNAME/docker-learning-lab:logging-app-v1

# Example:
# docker tag sample-logging-app leenataswamy/docker-learning-lab:logging-app-v1

# Verify the tag
docker images | grep docker-learning-lab
```

---

### Step 5: Push to Docker Hub

```bash
# Push the image
docker push YOUR_USERNAME/docker-learning-lab:logging-app-v1

# You should see upload progress bars
# Verify on Docker Hub website - the image should appear in your private repo
```

---

### Step 6: Pull from Docker Hub (Test)

```bash
# Remove local image to test pull
docker rmi YOUR_USERNAME/docker-learning-lab:logging-app-v1

# Pull from Docker Hub
docker pull YOUR_USERNAME/docker-learning-lab:logging-app-v1

# Run the pulled image
docker run --name test-pulled-app YOUR_USERNAME/docker-learning-lab:logging-app-v1

# Verify it works
docker logs test-pulled-app

# Clean up
docker stop test-pulled-app
docker rm test-pulled-app
```

---

### Step 7: Practice with Multiple Tags

```bash
# Create multiple tags for versioning
docker tag sample-logging-app YOUR_USERNAME/docker-learning-lab:latest
docker tag sample-logging-app YOUR_USERNAME/docker-learning-lab:v1.0.0
docker tag sample-logging-app YOUR_USERNAME/docker-learning-lab:stable

# Push all tags
docker push YOUR_USERNAME/docker-learning-lab:latest
docker push YOUR_USERNAME/docker-learning-lab:v1.0.0
docker push YOUR_USERNAME/docker-learning-lab:stable

# View all tags on Docker Hub website
```

---

### Step 8: Share Access (Optional)

For private repos, you can add collaborators:
1. Go to your repository on Docker Hub
2. Click **Collaborators** tab
3. Add team members by Docker Hub username
4. Set permissions: Read, Write, or Admin

---

### Step 9: Logout (Security Best Practice)

```bash
# When working on shared machines, always logout
docker logout

# To login again
docker login
```

---

## Task 3: Documentation & Architecture Diagram
### Document your Docker journey for GitHub

### Step 1: Create Repository Structure

```bash
mkdir -p ~/docker-home-lab
cd ~/docker-home-lab

# Create directory structure
mkdir -p {docs,diagrams,configs,screenshots}
```

---

### Step 2: Write Comprehensive README

**File: `README.md`**
```markdown
# Docker Home Lab - Week 2 Learning Journey
*Part of 90-Day Professional Development Plan | April 6-10, 2026*

## 🎯 Objective
Master Docker fundamentals through hands-on practice: containerization, orchestration, networking, logging, and registry management.

## 📚 Skills Covered
- Dockerfile creation & multi-stage builds
- Docker Compose for multi-container applications
- Docker Swarm for orchestration
- Kafka cluster simulation in Docker
- Container logging with Elastic Stack (Filebeat → Elasticsearch → Kibana)
- Docker Hub private registry management

## 🏗️ Architecture Overview
![Docker Lab Architecture](diagrams/docker-lab-architecture.png)

## 📁 Project Structure
```
docker-home-lab/
├── logging-stack/          # Elastic logging implementation
│   ├── docker-compose.yml
│   ├── filebeat/
│   └── apps/
├── swarm-cluster/          # Docker Swarm setup
├── kafka-cluster/          # Kafka in Docker
├── configs/                # Configuration files
├── docs/                   # Additional documentation
├── diagrams/               # Architecture diagrams
└── screenshots/            # Visual documentation
```

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed (or Docker Engine + Docker Compose on Linux)
- At least 8GB RAM available
- Basic understanding of containerization

### 1. Container Logging Setup

```bash
cd logging-stack
docker-compose up -d
```

Access Kibana: http://localhost:5601

### 2. Docker Hub Private Registry

```bash
# Login to Docker Hub
docker login

# Build and push image
docker build -t sample-app .
docker tag sample-app YOUR_USERNAME/repo:tag
docker push YOUR_USERNAME/repo:tag
```

## 📊 Key Learnings

### Docker Swarm
- Deployed 3-node swarm cluster (1 manager, 2 workers)
- Simulated Kafka cluster across swarm nodes
- Implemented service discovery and load balancing
- Key commands: `docker swarm init`, `docker service create`, `docker stack deploy`

### Elastic Logging Stack
- Configured Filebeat to collect Docker container logs
- Shipped logs to Elasticsearch for indexing
- Built Kibana dashboards for log visualization
- Implemented log filtering by container, severity, and time range

### Docker Hub Operations
- Created private repository for proprietary images
- Practiced image tagging strategies (semantic versioning)
- Implemented push/pull workflows
- Managed image access with collaborators

## 🎓 Best Practices Implemented

1. **Multi-stage builds** for smaller image sizes
2. **Health checks** in docker-compose.yml
3. **Resource limits** (CPU, memory) on containers
4. **Volume mounts** for data persistence
5. **Environment variables** for configuration
6. **Logging drivers** with rotation policies
7. **Security**: Non-root users, minimal base images

## 📸 Screenshots & Demos

See `screenshots/` directory for:
- Kibana dashboard showing real-time logs
- Docker Swarm visualizer
- Kafka cluster status
- Docker Hub repository

## 🔗 Integration with FIS Environment

Skills directly applicable to FIS Global production:
- **Container logging**: Elastic stack for microservices monitoring
- **Docker Swarm**: Alternative to Kubernetes for orchestration
- **Kafka**: Already used at FIS; this reinforces cluster management skills
- **Registry management**: Private registries for proprietary applications

## 📈 Next Steps (Week 3)

- Migrate to Kubernetes (minikube)
- Set up Harness CD pipeline
- Integrate OpenTelemetry for distributed tracing
- Deploy to GKE (Google Kubernetes Engine)

## 🏆 Achievements

- ✅ Deployed multi-container applications with Docker Compose
- ✅ Configured Swarm cluster and service orchestration
- ✅ Implemented end-to-end logging pipeline
- ✅ Managed private container registry
- ✅ Built reusable Docker configurations for future projects

## 📚 Resources

- [Docker Documentation](https://docs.docker.com/)
- [Elastic Stack Documentation](https://www.elastic.co/guide/index.html)
- [Docker Hub](https://hub.docker.com/)
- [Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

## 👤 Author

**Leenata Swamyrao**  
Lead Test Engineer - Performance Testing  
FIS Global Solutions, Pune

---
*This project is part of a structured 90-day upskilling plan focused on DevOps, cloud platforms, and advanced QA automation.*
```

---

### Step 3: Create Architecture Diagram

You have several options for creating diagrams:

#### Option A: Use Draw.io (Recommended)

1. Go to https://app.diagrams.net/
2. Create a new diagram
3. Use the template below as reference
4. Export as PNG: `docker-lab-architecture.png`
5. Save source file: `docker-lab-architecture.drawio`

**Diagram Components to Include:**
```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Home Lab                          │
│                  Architecture Overview                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐
│  Sample App 1    │     │  Sample App 2    │
│  (Container)     │     │  (Container)     │
│                  │     │                  │
│  Logs → JSON     │     │  Logs → JSON     │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────┐
         │   Filebeat     │
         │ (Log Shipper)  │
         │                │
         │ Docker API     │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Elasticsearch  │
         │ (Index & Store)│
         │                │
         │ Port: 9200     │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │     Kibana     │
         │ (Visualize)    │
         │                │
         │ Port: 5601     │
         └────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │     Browser    │
         │ http://...:5601│
         └────────────────┘

┌────────────────────────────────────────────────┐
│           Docker Hub Registry                   │
│                                                 │
│  Private Repo: username/docker-learning-lab     │
│                                                 │
│  Images:                                        │
│    - logging-app-v1                            │
│    - v1.0.0                                    │
│    - latest                                    │
└────────────────────────────────────────────────┘
```

#### Option B: Create ASCII Diagram (Quick)

Save this as `docs/architecture.txt`:

```
Docker Home Lab Architecture
==============================

Logging Stack Flow:
-------------------
[App Containers] → [Filebeat] → [Elasticsearch] → [Kibana] → [User Browser]
       │                              │
       └──── JSON logs ────────────────┘
       
       
Docker Hub Workflow:
--------------------
[Local Image] → docker tag → [Tagged Image] → docker push → [Docker Hub Private Repo]
                                                                      │
                                                                      ▼
                                                              [Other Machines]
                                                                      │
                                                              docker pull
                                                                      │
                                                                      ▼
                                                              [Running Container]

Components:
-----------
1. Sample Applications (Python)
2. Filebeat (Log collection)
3. Elasticsearch (Log storage & indexing)
4. Kibana (Log visualization)
5. Docker Hub (Private registry)
```

---

### Step 4: Document Key Commands

**File: `docs/commands-reference.md`**
```markdown
# Docker Commands Reference

## Container Logging

```bash
# View logs from a container
docker logs <container-name>
docker logs -f <container-name>  # Follow logs in real-time
docker logs --tail 100 <container-name>  # Last 100 lines

# Check logging driver
docker inspect <container-name> | grep LogPath
```

## Docker Hub Operations

```bash
# Login/Logout
docker login
docker logout

# Tag image
docker tag <source-image> <username>/<repo>:<tag>

# Push to Docker Hub
docker push <username>/<repo>:<tag>

# Pull from Docker Hub
docker pull <username>/<repo>:<tag>

# Remove local image
docker rmi <image-name>:<tag>
```

## Docker Compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
docker-compose logs <service-name>

# Check status
docker-compose ps

# Rebuild services
docker-compose up -d --build
```

## Troubleshooting

```bash
# Check running containers
docker ps

# Check all containers (including stopped)
docker ps -a

# Inspect container details
docker inspect <container-name>

# Execute command in running container
docker exec -it <container-name> bash

# View resource usage
docker stats

# Clean up unused resources
docker system prune
docker volume prune
```
```

---

### Step 5: Capture Screenshots

Take screenshots of:

1. **Kibana Discover View**
   - Showing logs from multiple containers
   - Save as: `screenshots/kibana-logs.png`

2. **Kibana with Filters Applied**
   - Filter by container name or log level
   - Save as: `screenshots/kibana-filtered.png`

3. **Docker Hub Repository**
   - Your private repo showing pushed images
   - Save as: `screenshots/dockerhub-repo.png`

4. **Terminal showing docker-compose ps**
   - All services running
   - Save as: `screenshots/docker-compose-status.png`

---

### Step 6: Initialize Git Repository

```bash
cd ~/docker-home-lab

# Initialize repo
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Docker
.env
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
EOF

# Add all files
git add .

# First commit
git commit -m "Initial commit: Docker Home Lab Week 2"

# Create GitHub repo (via GitHub website or CLI)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/docker-home-lab.git
git branch -M main
git push -u origin main
```

---

### Step 7: Add Detailed Documentation Files

**File: `docs/setup-guide.md`**
Document step-by-step setup instructions for someone reproducing your work.

**File: `docs/troubleshooting.md`**
Document issues you encountered and how you solved them.

**File: `docs/learnings.md`**
Document key insights and "aha moments" from the week.

---

### Step 8: Create a Project Summary

**File: `SUMMARY.md`**
```markdown
# Week 2 Docker Learning - Summary

## Time Investment
- **Total Hours**: ~10 hours (Apr 6-10, 2026)
- **Difficulty Level**: Intermediate

## Key Achievements
1. ✅ Deployed complete Elastic logging stack
2. ✅ Configured Filebeat for container log collection
3. ✅ Built Kibana dashboards for log analysis
4. ✅ Managed private Docker Hub registry
5. ✅ Created comprehensive documentation

## Skills Acquired
- Container logging architecture
- Elastic Stack (ELK) configuration
- Docker networking and volumes
- Registry management and security
- Infrastructure as Code (docker-compose.yml)

## Challenges & Solutions
1. **Challenge**: Elasticsearch memory issues
   **Solution**: Set JVM heap size in docker-compose: ES_JAVA_OPTS=-Xms512m -Xmx512m

2. **Challenge**: Filebeat permissions on macOS
   **Solution**: Run with user: root and strict.perms=false

3. **Challenge**: Logs not appearing in Kibana
   **Solution**: Wait for index creation, verify Filebeat connectivity

## Integration with Work
- Can implement similar logging at FIS for microservices monitoring
- Docker Hub private repos useful for proprietary applications
- Elastic Stack knowledge applicable to existing infrastructure

## Next Week Preview
- Migrate to Kubernetes (minikube)
- Set up Harness CD pipeline
- Integrate with OpenTelemetry
```

---

## 🎯 Final Checklist

Before marking Week 2 complete, ensure:

### Container Logging
- [ ] Elastic stack running successfully
- [ ] Logs visible in Kibana
- [ ] Index pattern created
- [ ] Screenshots captured
- [ ] docker-compose.yml documented

### Docker Hub
- [ ] Private repository created
- [ ] Image pushed successfully
- [ ] Image pulled and tested
- [ ] Multiple tags demonstrated
- [ ] Login/logout practiced

### Documentation
- [ ] README.md comprehensive
- [ ] Architecture diagram created
- [ ] Screenshots organized
- [ ] Commands reference documented
- [ ] Git repository initialized
- [ ] Pushed to GitHub

### GitHub Repository Structure
```
docker-home-lab/
├── README.md
├── SUMMARY.md
├── .gitignore
├── logging-stack/
│   ├── docker-compose.yml
│   ├── filebeat/
│   │   └── filebeat.yml
│   └── apps/
│       ├── Dockerfile
│       └── app.py
├── configs/
├── docs/
│   ├── commands-reference.md
│   ├── setup-guide.md
│   ├── troubleshooting.md
│   └── learnings.md
├── diagrams/
│   ├── docker-lab-architecture.png
│   └── docker-lab-architecture.drawio
└── screenshots/
    ├── kibana-logs.png
    ├── kibana-filtered.png
    ├── dockerhub-repo.png
    └── docker-compose-status.png
```

---

## 💡 Pro Tips

1. **Use descriptive commit messages**: 
   - ✅ "Add Filebeat configuration for container log collection"
   - ❌ "Update config"

2. **Document as you go**: Don't wait until the end to write documentation

3. **Take screenshots immediately**: Capture success moments while fresh

4. **Test your documentation**: Can someone else follow your README?

5. **Link to Week 3**: Your Kubernetes work builds directly on this foundation

---

## 📚 Additional Resources

- [Filebeat Docker Module](https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-docker.html)
- [Docker Logging Best Practices](https://docs.docker.com/config/containers/logging/)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [Effective Documentation Guide](https://www.writethedocs.org/guide/writing/beginners-guide-to-docs/)

---

**🎉 Congratulations!** 

You've completed all Docker tasks for Week 2. This foundation prepares you perfectly for Week 3's Kubernetes and Harness work.

**Next Steps (Week 3 - April 13-17):**
- Install minikube + kubectl
- Deploy containerized apps to Kubernetes
- Set up Harness CD pipeline
- Integrate OpenTelemetry, Prometheus, and Grafana

*Keep the momentum going! 🚀*
