FROM node:20-alpine3.20

WORKDIR /app

COPY package.json yarn.lock tsconfig.json tsconfig.build.json nest-cli.json src ./

RUN yarn install --production --frozen-lockfile

RUN mkdir -p /app/errorReports /app/uploads && \
    chmod -R 755 /app/errorReports /app/uploads

RUN yarn build

EXPOSE 3000

CMD ["yarn", "start:prod"]