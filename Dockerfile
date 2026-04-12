# Stage 1: Build the frontend with Vite
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx (for web preview/production web deployment)
FROM nginx:stable-alpine

# Copy the custom nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
