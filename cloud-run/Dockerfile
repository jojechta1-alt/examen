# Imagen base liviana con Node 20
FROM node:20-slim

# tfjs-node necesita estas librerías nativas para compilar/correr el binding
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./
COPY model ./model

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
