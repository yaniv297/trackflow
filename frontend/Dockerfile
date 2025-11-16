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

# Railway will provide PORT at runtime (typically 80)
# EXPOSE is just documentation - Railway handles port mapping

# Add build info to force cache invalidation
RUN echo "Build date: ${BUILD_DATE}" > /app/build-info.txt
RUN echo "VCS ref: ${VCS_REF}" >> /app/build-info.txt
RUN echo "This is the FRONTEND Dockerfile - REBUILD REQUIRED FOR HTTPS FIX" >> /app/build-info.txt

# Use Railway's PORT environment variable (Railway sets this automatically)
# serve needs explicit hostname binding - use --hostname flag
CMD ["sh", "-c", "serve -s build --listen $PORT --hostname 0.0.0.0"]
