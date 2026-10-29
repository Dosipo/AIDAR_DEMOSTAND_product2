# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source and build production assets
COPY . .
RUN npm run build

# Stage 2: Serve production assets with Nginx
FROM nginx:stable-alpine AS production

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 3000 to match project standard
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
