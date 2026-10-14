# 1) build the React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# the website calls /api/v1 on the same server; nginx forwards it to the backend
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# 2) serve the built files with nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80