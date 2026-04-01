FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

ENV PORT=3000
CMD ["npm", "start"]
