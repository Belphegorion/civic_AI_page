FROM node:18-bullseye-slim

# avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /usr/src/app

# install build deps in one layer, then clean apt lists
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     build-essential \
     python3 \
     git \
     ca-certificates \
     libvips-dev \
     libpng-dev \
     libjpeg-dev \
  && rm -rf /var/lib/apt/lists/*

# copy package manifests and install production deps
COPY package*.json ./
RUN npm ci --only=production

# copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
