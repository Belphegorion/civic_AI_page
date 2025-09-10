# frontend/Dockerfile (fallback to npm install if no lockfile)
FROM node:18-alpine AS build
WORKDIR /app

# sometimes git is required for deps
RUN apk add --no-cache git

# copy package metadata (lockfile optional)
COPY package.json package-lock.json* ./

# use npm ci when lockfile exists, otherwise fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# copy source and build
COPY . .
RUN npm run build

# serve with nginx
FROM nginx:stable-alpine AS www
# Adjust /app/dist below if your build outputs to /app/build
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
