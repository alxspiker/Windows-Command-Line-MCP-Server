FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Run the MCP server
CMD ["node", "dist/index.js"]
