FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the frontend port
EXPOSE 8010

# Command to run the application
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8010"] 