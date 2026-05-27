import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { JwtPayload, AuthenticatedRequest } from '../lib/types.js';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const payload = await request.jwtVerify<JwtPayload>();
    (request as AuthenticatedRequest).userId = payload.userId;
    (request as AuthenticatedRequest).username = payload.username;
    (request as AuthenticatedRequest).role = payload.role;
    (request as AuthenticatedRequest).userName = payload.name;
  } catch (err) {
    reply.code(401).send({ error: '未授权访问', message: '请先登录' });
  }
}

export function requireRole(requiredRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const req = request as AuthenticatedRequest;
    if (!requiredRoles.includes(req.role)) {
      reply.code(403).send({ error: '权限不足', message: '您没有权限执行此操作' });
    }
  };
}

export function authPlugin(app: FastifyInstance): void {
  app.decorateRequest('userId', null);
  app.decorateRequest('username', null);
  app.decorateRequest('role', null);
  app.decorateRequest('userName', null);

  app.addHook('onRequest', async (request, reply) => {
    const publicRoutes = [
      { method: 'POST', url: '/api/auth/login' },
    ];

    const isPublic = publicRoutes.some(
      (route) => request.method === route.method && request.url === route.url
    );

    if (!isPublic) {
      await authenticate(request, reply);
    }
  });
}
