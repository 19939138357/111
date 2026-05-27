import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { bookSearchSchema, BookSearchInput, bookIdSchema, BookIdInput } from '../lib/schemas.js';
import { buildPaginatedResponse } from '../lib/types.js';

export async function bookRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/books',
    async (
      request: FastifyRequest<{ Querystring: BookSearchInput }>,
      reply: FastifyReply
    ) => {
      const validated = bookSearchSchema.safeParse(request.query);
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { keyword, category, page, pageSize } = validated.data;
      const skip = (page - 1) * pageSize;

      const where: Prisma.book_titleWhereInput = {};

      if (keyword) {
        where.OR = [
          { title: { contains: keyword, mode: 'insensitive' } },
          { author: { contains: keyword, mode: 'insensitive' } },
          { isbn: { contains: keyword } },
        ];
      }

      if (category) {
        where.category = category;
      }

      const [books, total] = await Promise.all([
        prisma.book_title.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { title: 'asc' },
          include: {
            _count: {
              select: {
                book_copies: {
                  where: {
                    status: 'available',
                  },
                },
              },
            },
          },
        }),
        prisma.book_title.count({ where }),
      ]);

      const formattedBooks = books.map((book) => ({
        ...book,
        availableCopies: book._count.book_copies,
        _count: undefined,
      }));

      return reply.code(200).send({
        message: '获取成功',
        data: buildPaginatedResponse(formattedBooks, total, page, pageSize),
      });
    }
  );

  app.get(
    '/api/books/:bookId',
    async (
      request: FastifyRequest<{ Params: BookIdInput }>,
      reply: FastifyReply
    ) => {
      const validated = bookIdSchema.safeParse(request.params);
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { bookId } = validated.data;

      const book = await prisma.book_title.findUnique({
        where: { id: bookId },
        include: {
          book_copies: {
            orderBy: { barcode: 'asc' },
          },
        },
      });

      if (!book) {
        return reply.code(404).send({
          error: '未找到',
          message: '书目不存在',
        });
      }

      const availableCount = book.book_copies.filter((c) => c.status === 'available').length;

      return reply.code(200).send({
        message: '获取成功',
        data: {
          ...book,
          availableCopies: availableCount,
          totalCopies: book.book_copies.length,
        },
      });
    }
  );
}
