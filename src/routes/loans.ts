import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, AuditAction } from '@prisma/client';
import { requireRole } from '../middleware/auth.js';
import { AuthenticatedRequest, buildPaginatedResponse } from '../lib/types.js';
import prisma from '../lib/prisma.js';
import {
  checkoutSchema,
  CheckoutInput,
  renewSchema,
  RenewInput,
  returnBookSchema,
  ReturnBookInput,
} from '../lib/schemas.js';
import { checkOutBook, returnBook, renewLoan } from '../services/loan.js';
import { createAuditLog } from '../services/audit.js';

export async function loanRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/loans/checkout',
    {
      preHandler: [requireRole([UserRole.librarian])],
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const validated = checkoutSchema.safeParse(request.body);
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { userId, barcode } = validated.data;
      const req = request as AuthenticatedRequest;

      try {
        const result = await checkOutBook(
          userId,
          barcode,
          req.userId,
          req.userName
        );

        await createAuditLog({
          action: AuditAction.book_checked_out,
          actorId: req.userId,
          actorName: req.userName,
          targetType: 'loan_record',
          targetId: result.loan.id,
          details: JSON.stringify({
            bookTitle: result.loan.book_copy.book_title.title,
            barcode: result.loan.book_copy.barcode,
            userId: userId,
            dueDate: result.loan.due_date.toISOString(),
          }),
        });

        return reply.code(201).send({
          message: '借书成功',
          data: result.loan,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '借书失败';
        return reply.code(400).send({
          error: '操作失败',
          message,
        });
      }
    }
  );

  app.get(
    '/api/loans/my',
    async (
      request: FastifyRequest<{
        Querystring: { page?: string; pageSize?: string; status?: string };
      }>,
      reply: FastifyReply
    ) => {
      const req = request as AuthenticatedRequest;
      const page = parseInt(request.query.page || '1', 10);
      const pageSize = parseInt(request.query.pageSize || '20', 10);
      const skip = (page - 1) * pageSize;

      const where: Record<string, unknown> = {
        user_id: req.userId,
      };
      if (request.query.status) {
        where.status = request.query.status;
      }

      const [loans, total] = await Promise.all([
        prisma.loan_record.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { checkout_date: 'desc' },
          include: {
            book_copy: {
              include: {
                book_title: true,
              },
            },
          },
        }),
        prisma.loan_record.count({ where }),
      ]);

      return reply.code(200).send({
        message: '获取成功',
        data: buildPaginatedResponse(loans, total, page, pageSize),
      });
    }
  );

  app.post(
    '/api/loans/:loanId/renew',
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const validated = renewSchema.safeParse(request.params);
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { loanId } = validated.data;
      const req = request as AuthenticatedRequest;

      try {
        const result = await renewLoan(
          loanId,
          req.userId,
          req.userId,
          req.userName
        );

        await createAuditLog({
          action: AuditAction.book_renewed,
          actorId: req.userId,
          actorName: req.userName,
          targetType: 'loan_record',
          targetId: result.loan.id,
          details: JSON.stringify({
            bookTitle: result.loan.book_copy.book_title.title,
            newDueDate: result.loan.due_date.toISOString(),
            renewCount: result.loan.renew_count,
          }),
        });

        return reply.code(200).send({
          message: '续借成功',
          data: result.loan,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '续借失败';
        return reply.code(400).send({
          error: '操作失败',
          message,
        });
      }
    }
  );

  app.post(
    '/api/loans/:loanId/return',
    {
      preHandler: [requireRole([UserRole.librarian])],
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const validated = returnBookSchema.safeParse(request.params);
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { loanId } = validated.data;
      const req = request as AuthenticatedRequest;

      try {
        const result = await returnBook(
          loanId,
          req.userId,
          req.userName
        );

        await createAuditLog({
          action: AuditAction.book_returned,
          actorId: req.userId,
          actorName: req.userName,
          targetType: 'loan_record',
          targetId: result.loan.id,
          details: JSON.stringify({
            bookTitle: result.loan.book_copy.book_title.title,
            overdueDays: result.overdueDays,
            fineCreated: result.fineCreated,
            fineAmount: result.fineAmount,
          }),
        });

        return reply.code(200).send({
          message: '还书成功',
          data: {
            loan: result.loan,
            overdueDays: result.overdueDays,
            fineCreated: result.fineCreated,
            fineAmount: result.fineAmount,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '还书失败';
        return reply.code(400).send({
          error: '操作失败',
          message,
        });
      }
    }
  );
}
