FROM postgres:15-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20.x
ENV POSTGRES_USER=library_user
ENV POSTGRES_PASSWORD=library_password
ENV POSTGRES_DB=library_db
ENV DATABASE_URL=postgresql://library_user:library_password@localhost:5432/library_db?schema=public
ENV JWT_SECRET=library-jwt-secret-key-change-in-production-123456
ENV JWT_EXPIRES_IN=24h
ENV PORT=3000
ENV PGDATA=/var/lib/postgresql/data

WORKDIR /app

RUN apt-get update && apt-get install -y curl git gnupg sudo && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@latest typescript

COPY package.json package-lock.json ./

RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY tests ./tests
COPY tsconfig.json ./

RUN npx prisma generate

RUN npm run build

COPY start.sh /start.sh
RUN chmod +x /start.sh

RUN mkdir -p /docker-entrypoint-initdb.d

ENV NODE_ENV=production

EXPOSE 3000

CMD ["/start.sh"]
