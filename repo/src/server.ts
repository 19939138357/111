import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { config } from './lib/config.js';
import { authPlugin } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { bookRoutes } from './routes/books.js';
import { loanRoutes } from './routes/loans.js';
import { fineRoutes } from './routes/fines.js';
import { auditRoutes } from './routes/audit.js';

const app = fastify({ logger: true });

app.register(fastifyJwt, {
  secret: config.jwt.secret,
});

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: '图书馆借阅与馆藏盘点系统 API',
      description: '图书馆借阅系统 MVP 后端 API 文档',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '本地开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
});

app.register(fastifySwaggerUi, {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
});

authPlugin(app);

app.register(authRoutes);
app.register(bookRoutes);
app.register(loanRoutes);
app.register(fineRoutes);
app.register(auditRoutes);

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

async function start() {
  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });
    console.log(`🚀 服务器运行在 http://localhost:${config.server.port}`);
    console.log(`📖 API 文档: http://localhost:${config.server.port}/documentation`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
