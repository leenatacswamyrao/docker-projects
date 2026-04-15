# Docker Hub Operations

## Public Repository
- Image: yourusername/my-first-app:v1
- Anyone can pull this image

## Private Repository
- Image: yourusername/my-private-app:v1
- Only I can access this

## Commands
- `docker login` - Authenticate
- `docker tag <source> <target>` - Rename image
- `docker push <image>` - Upload to Docker Hub
- `docker pull <image>` - Download from Docker Hub

## Architecture

Local Machine           Docker Hub              Remote Machine
┌─────────────┐        ┌──────────┐           ┌─────────────┐
│  Dockerfile │──build→│   Image  │←──pull────│   Docker    │
│             │        │  Stored  │           │   Engine    │
│  docker     │──push─→│   Here   │           │             │
│  build      │        │          │           │             │
└─────────────┘        └──────────┘           └─────────────┘
