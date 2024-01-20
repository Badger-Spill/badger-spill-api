FROM node:latest
COPY . .
COPY /etc/letsencrypt /etc/letsencrypt
RUN npm install
CMD ["node", "server.js"]