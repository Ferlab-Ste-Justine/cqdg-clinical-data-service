FROM node:14.4.0-alpine

ADD . /code
WORKDIR /code

RUN apk update && apk add python g++ make && rm -rf /var/cache/apk/*
RUN npm install --silent

EXPOSE 4000

CMD ["npm", "start", "serve"]
