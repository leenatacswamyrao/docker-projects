# Docker Swarm & Kafka Cluster Setup

**Date:** April 8-9, 2026  
**Objective:** Learn Docker Swarm fundamentals and deploy a multi-broker Kafka cluster

## Table of Contents
- [Docker Swarm Basics](#docker-swarm-basics)
- [Multi-Service Stack Deployment](#multi-service-stack-deployment)
- [Kafka Cluster - Docker Compose](#kafka-cluster---docker-compose)
- [Kafka Cluster - Docker Swarm](#kafka-cluster---docker-swarm)
- [Testing & Verification](#testing--verification)
- [Key Learnings](#key-learnings)

---

## Docker Swarm Basics

### Initialize Swarm
```bash
docker swarm init
```

**Verify swarm node:**
```bash
docker node ls
```

Output shows manager node with "Leader" status.

### Deploy First Service
```bash
# Create a simple nginx service with 3 replicas
docker service create --name web --replicas 3 --publish 8080:80 nginx:alpine

# List services
docker service ls

# View individual tasks (containers)
docker service ps web
```

### Scale Services
```bash
# Scale up
docker service scale web=5

# Scale down
docker service scale web=2

# Inspect service
docker service inspect web --pretty

# Remove service
docker service rm web
```

**Key Learning:** Swarm automatically manages replicas - if a container fails, swarm restarts it.

---

## Multi-Service Stack Deployment

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    deploy:
      replicas: 2
    ports:
      - "8080:80"
    networks:
      - frontend

  app:
    image: httpd:alpine
    deploy:
      replicas: 3
    networks:
      - frontend
      - backend

  redis:
    image: redis:alpine
    deploy:
      replicas: 1
    networks:
      - backend

networks:
  frontend:
    driver: overlay  # Required for swarm mode
  backend:
    driver: overlay
```

### Deploy the Stack
```bash
docker stack deploy -c docker-compose.yml mystack

# List services in stack
docker stack services mystack

# View all tasks
docker stack ps mystack

# List all stacks
docker stack ls

# Remove stack
docker stack rm mystack
```

**Key Learning:** 
- Stacks deploy multiple services as one unit
- Overlay networks required for swarm mode
- Services can communicate across networks

---

## Kafka Cluster - Docker Compose

**File:** `docker-compose-kafka.yml`

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    hostname: zookeeper
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka-broker-1:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka-broker-1
    container_name: kafka-broker-1
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-broker-1:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 2

  kafka-broker-2:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka-broker-2
    container_name: kafka-broker-2
    depends_on:
      - zookeeper
    ports:
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 2
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-broker-2:29092,PLAINTEXT_HOST://localhost:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 2
```

### Deploy
```bash
docker-compose -f docker-compose-kafka.yml up -d

# Check status
docker-compose -f docker-compose-kafka.yml ps

# View logs
docker logs kafka-broker-1 --tail 20

# Stop and remove
docker-compose -f docker-compose-kafka.yml down
```

---

## Kafka Cluster - Docker Swarm

**File:** `kafka-swarm-stack.yml`

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    hostname: zookeeper
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - kafka-net

  kafka-broker-1:
    image: confluentinc/cp-kafka:7.5.0
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 60s
        max_attempts: 3
    ports:
      - target: 9092
        published: 9092
        mode: host
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-broker-1:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 2
      KAFKA_ZOOKEEPER_CONNECTION_TIMEOUT_MS: 60000
    networks:
      - kafka-net

  kafka-broker-2:
    image: confluentinc/cp-kafka:7.5.0
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 60s
        max_attempts: 3
    ports:
      - target: 9093
        published: 9093
        mode: host
    environment:
      KAFKA_BROKER_ID: 2
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-broker-2:29092,PLAINTEXT_HOST://localhost:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 2
      KAFKA_ZOOKEEPER_CONNECTION_TIMEOUT_MS: 60000
    networks:
      - kafka-net

networks:
  kafka-net:
    driver: overlay
```

### Deploy
```bash
docker stack deploy -c kafka-swarm-stack.yml kafka-swarm

# Monitor deployment
docker stack ps kafka-swarm

# Check service logs
docker service logs kafka-swarm_kafka-broker-1 --tail 30

# Remove stack
docker stack rm kafka-swarm
```

---

## Testing & Verification

### Create Kafka Topic
```bash
# Get into a broker container
docker exec -it <kafka-broker-container-id> bash

# Create topic with 3 partitions, replication factor 2
kafka-topics --create \
  --topic test-topic \
  --partitions 3 \
  --replication-factor 2 \
  --bootstrap-server kafka-broker-1:29092

# List topics
kafka-topics --list --bootstrap-server kafka-broker-1:29092

# Describe topic (see partition distribution)
kafka-topics --describe --topic test-topic --bootstrap-server kafka-broker-1:29092
```

**Expected Output:**
```
Topic: test-topic
PartitionCount: 3
ReplicationFactor: 2
```

### Produce Messages
```bash
# Inside broker container
kafka-console-producer --topic test-topic --bootstrap-server kafka-broker-1:29092

# Type messages (press Enter after each):
> Hello from Kafka!
> This is message 2
> Testing replication
```

Press `Ctrl+C` to exit.

### Consume Messages
```bash
# In a new terminal, exec into broker 2
docker exec -it <kafka-broker-2-container-id> bash

# Consume from beginning
kafka-console-consumer \
  --topic test-topic \
  --from-beginning \
  --bootstrap-server kafka-broker-2:29092
```

**Expected:** All messages appear, proving:
- Messages distributed across partitions
- Replication working between brokers
- Cross-broker communication functioning

---

## Key Learnings

### Docker Compose vs Docker Swarm

| Feature | Docker Compose | Docker Swarm |
|---------|---------------|--------------|
| **Use Case** | Local development | Production/Multi-node |
| **Networks** | Bridge (default) | Overlay (required) |
| **container_name** | ✅ Supported | ❌ Not allowed |
| **depends_on** | ✅ Honored | ❌ Ignored |
| **deploy section** | ❌ Ignored | ✅ Required |
| **Scaling** | Manual `--scale` | Built-in `replicas` |
| **Startup Order** | Guaranteed | Must handle manually |
| **Self-Healing** | No | Yes (auto-restart) |

### Kafka Listener Configuration

**Why two listeners?**

- **PLAINTEXT://kafka-broker-1:29092** → Internal (container-to-container)
- **PLAINTEXT_HOST://localhost:9092** → External (host-to-container)

**Flow:**
```
Host machine → localhost:9092 → PLAINTEXT_HOST listener
Container → kafka-broker-1:29092 → PLAINTEXT listener
```

Port 29092 is for inter-broker communication; 9092/9093 are exposed to host.

### Swarm Challenges & Solutions

**Challenge:** Kafka brokers starting before Zookeeper ready  
**Solution:** Added `delay: 60s` in restart policy + increased `KAFKA_ZOOKEEPER_CONNECTION_TIMEOUT_MS`

**Challenge:** Network not found errors  
**Solution:** Ensure `driver: overlay` explicitly set in networks section

**Challenge:** No startup order guarantee  
**Solution:** Use restart policies with delays, or deploy services in phases

---

## Commands Quick Reference

```bash
# Swarm Management
docker swarm init
docker node ls
docker swarm leave --force

# Service Management
docker service create --name <name> --replicas <n> <image>
docker service ls
docker service ps <service>
docker service scale <service>=<n>
docker service logs <service>
docker service rm <service>

# Stack Management
docker stack deploy -c <file.yml> <stack-name>
docker stack ls
docker stack services <stack>
docker stack ps <stack>
docker stack rm <stack>

# Network Management
docker network ls
docker network inspect <network>
docker network rm <network>

# PowerShell Alternatives
docker ps | Select-String <pattern>  # Instead of grep
docker ps | sls <pattern>            # Short alias
```

---

## What's Next

**Tomorrow (April 9):**
- Container logging with Elastic (Filebeat → Elasticsearch → Kibana)
- Docker Hub: push/pull private images
- GCP: Kubernetes in Google Cloud quest

**Week 3:**
- Kubernetes (minikube) deployment
- Harness CI/CD pipeline
- OpenTelemetry + Prometheus + Grafana + Dynatrace observability stack

---

## References

- [Docker Swarm Documentation](https://docs.docker.com/engine/swarm/)
- [Confluent Kafka Docker Images](https://hub.docker.com/r/confluentinc/cp-kafka)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Docker Overlay Networks](https://docs.docker.com/network/overlay/)

---

**Author:** Leenata Swamyrao  
**Date:** April 8-9, 2026  
**Part of:** 90-Day Professional Development Plan - Week 2
