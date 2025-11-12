# Multi-stage Dockerfile for TFT Multiplayer Game

FROM node:18-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install server dependencies
WORKDIR /app/server
RUN npm install --production

# Copy all application files
WORKDIR /app
COPY server ./server
COPY tft_web ./tft_web
COPY shared ./shared

# Expose port
EXPOSE 3000

# Set environment variable for port
ENV PORT=3000

# Start the server
WORKDIR /app/server
CMD ["node", "index.js"]
