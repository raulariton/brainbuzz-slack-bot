# node.js on alpine linux
FROM node:20-alpine

# set working dir in container
WORKDIR /app

# copy package.json and package-lock.json
COPY package*.json ./

# install dependencies, excluding dev dependencies
RUN npm ci --only=production

# copy the rest of files
COPY . .

# expose the port app runs on
EXPOSE 3000

# command to run the app
CMD ["npm", "start"]