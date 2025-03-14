FROM node:22-alpine

WORKDIR /usr/app

ARG DB
ENV DATABASE_URL=${DB}
RUN echo "in Dockerfile DATABASE_URL: ${DATABASE_URL}"

COPY package*.json ./

RUN npm install

COPY  . .

RUN npm run build

RUN npm run db:migrate

EXPOSE 4000

CMD [ "npm", "start" ]
