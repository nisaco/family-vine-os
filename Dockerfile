FROM node:20-bookworm-slim
WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build Next.js application
ENV NODE_ENV=production
RUN npm run build

# Default persistent database location and port
ENV PORT=3000
ENV DATABASE_PATH=/var/data/family_vine.db

EXPOSE 3000

CMD ["npm", "run", "start"]

