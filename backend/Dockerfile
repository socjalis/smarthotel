# Use the official Node.js image as the base image
FROM node:20-alpine3.20

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json tsconfig.json tsconfig.build.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code to the working directory
COPY . .

# Create errorReports and uploads folders with appropriate permissions
RUN mkdir -p /app/errorReports /app/uploads && \
    chmod -R 755 /app/errorReports /app/uploads

# Build the NestJS application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "run", "start:prod"]