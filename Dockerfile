FROM node:14.4.0-alpine as build

ADD . /code
WORKDIR /code

RUN apk update && apk add python g++ make && rm -rf /var/cache/apk/*
RUN npm install --silent
RUN npm run build

FROM node:14.4.0-alpine as runtime

COPY --from=build /code /code
WORKDIR /code

EXPOSE 4000

CMD npm start db.migrate && npm start
