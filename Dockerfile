FROM node:20.19-bookworm-slim
WORKDIR /app

# Install build dependencies for the retained SQLite migration tooling
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build Next.js application
ENV NODE_ENV=production
RUN npm run build

# Application port
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
