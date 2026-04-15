# Docker Logging with Elastic Stack

## What I Learned
- Filebeat collects logs from Docker containers
- Elasticsearch stores and indexes the logs
- Kibana provides UI to search and visualize logs

## Commands Used
- `docker-compose up -d` - Start all services
- `docker logs <container>` - View container logs
- `curl http://localhost:9200` - Test Elasticsearch

## Troubleshooting
- If Kibana won't load: Wait longer, check `docker logs kibana`
- If no logs appear: Check filebeat is running `docker logs filebeat`
