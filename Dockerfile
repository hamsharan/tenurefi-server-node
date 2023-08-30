FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npx prisma generate

RUN npm run build

EXPOSE 3333

CMD ["npm", "start"]