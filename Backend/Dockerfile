FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create uploads and logs directories
RUN mkdir -p uploads logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Expose port
EXPOSE 5001

# Start the app
CMD ["node", "src/server.js"] 