import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, AuditAction, FineStatus } from '@prisma/client';
import { requireRole } from '../middleware/auth.js';
import { AuthenticatedRequest, buildPaginatedResponse } from '../lib/types.js';
import prisma from '../lib/prisma.js';
import { fineListSchema, FineListInput, fineProcessSchema, FineProcessInput } from '../lib/schemas.js';
import { createAuditLog } from '../services/audit.js';

export async function fineRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/fines',
    async (
      request: FastifyRequest<{ Querystring: FineListInput }>,
      reply: FastifyReply
    ) => {
      const validated = fineListSchema.safeParse(request.query);
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { userId, status, page, pageSize } = validated.data;
      const skip = (page - 1) * pageSize;
      const req = request as AuthenticatedRequest;

      const where: Record<string, unknown> = {};

      if (req.role === UserRole.reader) {
        where.user_id = req.userId;
      } else if (userId) {
        where.user_id = userId;
      }

      if (status) {
        where.status = status;
      }

      const [fines, total] = await Promise.all([
        prisma.fine_record.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { created_at: 'desc' },
          include: {
            loan_record: {
              include: {
                book_copy: {
                  include: {
                    book_title: true,
                  },
                },
              },
            },
          },
        }),
        prisma.fine_record.count({ where }),
      ]);

      return reply.code(200).send({
        message: '获取成功',
        data: buildPaginatedResponse(fines, total, page, pageSize),
      });
    }
  );

  app.post(
    '/api/fines/:fineId/process',
    {
      preHandler: [requireRole([UserRole.librarian])],
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const validated = fineProcessSchema.safeParse(request.params);
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { fineId } = validated.data;
      const req = request as AuthenticatedRequest;

      const fine = await prisma.fine_record.findUnique({
        where: { id: fineId },
      });

      if (!fine) {
        return reply.code(404).send({
          error: '未找到',
          message: '罚金记录不存在',
        });
      }

      if (fine.status !== FineStatus.pending) {
        return reply.code(400).send({
          error: '操作失败',
          message: `该罚金已处于 ${fine.status} 状态，无法再次处理`,
        });
      }

      const updatedFine = await prisma.fine_record.update({
        where: { id: fineId },
        data: {
          status: FineStatus.processed,
          processed_at: new Date(),
          processed_by_id: req.userId,
          note: 'Mock 支付处理完成',
        },
      });

      await createAuditLog({
        action: AuditAction.fine_processed,
        actorId: req.userId,
        actorName: req.userName,
        targetType: 'fine_record',
        targetId: fineId,
        details: JSON.stringify({
          amount: fine.amount.toString(),
          reason: fine.reason,
        }),
      });

      return reply.code(200).send({
        message: '罚金处理成功',
        data: updatedFine,
      });
    }
  );
}
