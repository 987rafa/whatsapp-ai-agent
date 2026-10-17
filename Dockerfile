FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV DATA_DIR=/data
VOLUME /data

CMD ["node", "--env-file-if-exists=.env", "src/index.js"]
