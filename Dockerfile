FROM node:20-alpine

WORKDIR /app
COPY . .

RUN npm ci && \
    npm run lint && \
    npm run test && \
    npm run build

EXPOSE 8081
EXPOSE 8082
EXPOSE 8083
EXPOSE 8084

CMD ["npm", "start"]
