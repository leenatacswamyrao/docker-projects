FROM node:18

#Set working directory inside container
WORKDIR /app

#Copy package.json and package-lock.json first for caching
COPY app/package*.json ./

#Install dependencies
RUN npm install

#Copy the rest of the app code
COPY app .

#Run the app
CMD ["node", "index.js"]