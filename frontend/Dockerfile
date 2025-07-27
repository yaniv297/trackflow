FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm install -g serve

EXPOSE 3000

RUN echo "This is the FRONTEND Dockerfile"


CMD ["serve", "-s", "build", "-l", "3000", "--single", "--no-clipboard", "--listen", "0.0.0.0"]
