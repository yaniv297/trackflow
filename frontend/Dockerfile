FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm install -g serve

EXPOSE $PORT

RUN echo "This is the FRONTEND Dockerfile"

CMD ["sh", "-c", "serve -s build -l 0.0.0.0:$PORT"]
