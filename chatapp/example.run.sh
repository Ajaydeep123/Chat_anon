docker-compose down
export UPSTASH_REDIS_REST_URL="upstash redis url"
export CORS_ORIGIN=http://localhost:3000
docker-compose up -d --build