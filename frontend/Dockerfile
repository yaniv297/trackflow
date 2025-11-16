FROM node:18-alpine

WORKDIR /app

# Add build argument to force rebuild
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

# Accept React environment variables as build arguments
ARG REACT_APP_API_URL

# Set them as environment variables for the build process
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm install -g serve

EXPOSE 3000

# Add build info to force cache invalidation
RUN echo "Build date: ${BUILD_DATE}" > /app/build-info.txt
RUN echo "VCS ref: ${VCS_REF}" >> /app/build-info.txt
RUN echo "This is the FRONTEND Dockerfile - REBUILD REQUIRED FOR HTTPS FIX" >> /app/build-info.txt

CMD ["sh", "-c", "serve -s build -l 3000"]
