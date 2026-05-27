import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, Prisma } from '@prisma/client';
import { requireRole } from '../middleware/auth.js';
import { buildPaginatedResponse } from '../lib/types.js';
import prisma from '../lib/prisma.js';
import { auditLogListSchema, AuditLogListInput } from '../lib/schemas.js';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/audit-logs',
    {
      preHandler: [requireRole([UserRole.librarian])],
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const validated = auditLogListSchema.safeParse(
        request.query as AuditLogListInput
      );
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { action, actorName, targetType, page, pageSize } = validated.data;
      const skip = (page - 1) * pageSize;

      const where: Prisma.audit_logWhereInput = {};

      if (action) {
        where.action = action;
      }

      if (actorName) {
        where.actor_name = {
          contains: actorName,
          mode: 'insensitive',
        };
      }

      if (targetType) {
        where.target_type = targetType;
      }

      const [logs, total] = await Promise.all([
        prisma.audit_log.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { created_at: 'desc' },
        }),
        prisma.audit_log.count({ where }),
      ]);

      return reply.code(200).send({
        message: '获取成功',
        data: buildPaginatedResponse(logs, total, page, pageSize),
      });
    }
  );
}
