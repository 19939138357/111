import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { UserRole, AuditAction } from '@prisma/client';
import { auditRoutes } from '../src/routes/audit.js';
import prisma from '../src/lib/prisma.js';
import { requireRole } from '../src/middleware/auth.js';

vi.mock('../src/lib/prisma.js', () => ({
  default: {
    audit_log: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../src/middleware/auth.js', () => ({
  requireRole: vi.fn((roles) => {
    return async (request, reply) => {
      (request as any).userId = 'test-librarian-id';
      (request as any).username = 'librarian';
      (request as any).role = UserRole.librarian;
      (request as any).userName = '张馆员';
    };
  }),
}));

const mockAuditLogs = [
  {
    id: 'log-1',
    action: AuditAction.book_checked_out,
    actor_id: 'librarian-1',
    actor_name: '张馆员',
    target_type: 'loan_record',
    target_id: 'loan-1',
    details: '{}',
    created_at: new Date('2026-01-01'),
  },
  {
    id: 'log-2',
    action: AuditAction.book_returned,
    actor_id: 'librarian-1',
    actor_name: '张馆员',
    target_type: 'loan_record',
    target_id: 'loan-2',
    details: '{}',
    created_at: new Date('2026-01-02'),
  },
  {
    id: 'log-3',
    action: AuditAction.fine_processed,
    actor_id: 'librarian-2',
    actor_name: '李馆员',
    target_type: 'fine_record',
    target_id: 'fine-1',
    details: '{}',
    created_at: new Date('2026-01-03'),
  },
  {
    id: 'log-4',
    action: AuditAction.book_renewed,
    actor_id: 'librarian-2',
    actor_name: '李馆员',
    target_type: 'loan_record',
    target_id: 'loan-3',
    details: '{}',
    created_at: new Date('2026-01-04'),
  },
];

function buildTestApp(): FastifyInstance {
  const app = fastify();
  app.register(auditRoutes);
  return app;
}

describe('GET /api/audit-logs - 过滤功能测试', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = buildTestApp();
    await app.ready();
  });

  describe('单条件过滤测试', () => {
    it('应能按 actorName 进行模糊过滤', async () => {
      const mockFilteredLogs = mockAuditLogs.filter((log) =>
        log.actor_name.includes('张')
      );

      vi.mocked(prisma.audit_log.findMany).mockResolvedValueOnce(
        mockFilteredLogs
      );
      vi.mocked(prisma.audit_log.count).mockResolvedValueOnce(
        mockFilteredLogs.length
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?actorName=张',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.data).toHaveLength(2);
      expect(body.data.total).toBe(2);

      expect(prisma.audit_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actor_name: expect.objectContaining({
              contains: '张',
              mode: 'insensitive',
            }),
          }),
        })
      );
    });

    it('应能按 targetType 进行精确过滤', async () => {
      const mockFilteredLogs = mockAuditLogs.filter(
        (log) => log.target_type === 'fine_record'
      );

      vi.mocked(prisma.audit_log.findMany).mockResolvedValueOnce(
        mockFilteredLogs
      );
      vi.mocked(prisma.audit_log.count).mockResolvedValueOnce(
        mockFilteredLogs.length
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?targetType=fine_record',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.data).toHaveLength(1);
      expect(body.data.total).toBe(1);
      expect(body.data.data[0].target_type).toBe('fine_record');

      expect(prisma.audit_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            target_type: 'fine_record',
          }),
        })
      );
    });

    it('应能按 action 进行过滤 (现有功能)', async () => {
      const mockFilteredLogs = mockAuditLogs.filter(
        (log) => log.action === AuditAction.book_checked_out
      );

      vi.mocked(prisma.audit_log.findMany).mockResolvedValueOnce(
        mockFilteredLogs
      );
      vi.mocked(prisma.audit_log.count).mockResolvedValueOnce(
        mockFilteredLogs.length
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?action=book_checked_out',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.data).toHaveLength(1);
      expect(body.data.total).toBe(1);
    });
  });

  describe('组合过滤测试', () => {
    it('应能同时使用 actorName 和 targetType 进行组合过滤', async () => {
      const mockFilteredLogs = mockAuditLogs.filter(
        (log) =>
          log.actor_name.includes('张') && log.target_type === 'loan_record'
      );

      vi.mocked(prisma.audit_log.findMany).mockResolvedValueOnce(
        mockFilteredLogs
      );
      vi.mocked(prisma.audit_log.count).mockResolvedValueOnce(
        mockFilteredLogs.length
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?actorName=张&targetType=loan_record',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.data).toHaveLength(2);
      expect(body.data.total).toBe(2);

      expect(prisma.audit_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actor_name: expect.objectContaining({
              contains: '张',
            }),
            target_type: 'loan_record',
          }),
        })
      );
    });

    it('应能同时使用 action、actorName 和 targetType 进行组合过滤', async () => {
      const mockFilteredLogs = mockAuditLogs.filter(
        (log) =>
          log.action === AuditAction.book_checked_out &&
          log.actor_name.includes('张') &&
          log.target_type === 'loan_record'
      );

      vi.mocked(prisma.audit_log.findMany).mockResolvedValueOnce(
        mockFilteredLogs
      );
      vi.mocked(prisma.audit_log.count).mockResolvedValueOnce(
        mockFilteredLogs.length
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?action=book_checked_out&actorName=张&targetType=loan_record',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.data).toHaveLength(1);
      expect(body.data.total).toBe(1);
    });
  });

  describe('非法分页参数测试', () => {
    it('当 page 小于 1 时应返回参数错误', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?page=0',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('参数错误');
      expect(body.details).toBeDefined();
    });

    it('当 pageSize 小于 1 时应返回参数错误', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?pageSize=0',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('参数错误');
      expect(body.details).toBeDefined();
    });

    it('当 pageSize 大于 100 时应返回参数错误', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?pageSize=101',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('参数错误');
      expect(body.details).toBeDefined();
    });

    it('当 targetType 不是有效值时应返回参数错误', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?targetType=invalid_type',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('参数错误');
      expect(body.details).toBeDefined();
    });

    it('当 actorName 为空字符串时应返回参数错误', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?actorName=',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('参数错误');
      expect(body.details).toBeDefined();
    });
  });

  describe('无结果返回测试', () => {
    it('当过滤条件无匹配时应返回空数组', async () => {
      vi.mocked(prisma.audit_log.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.audit_log.count).mockResolvedValueOnce(0);

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?actorName=不存在的人',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.data).toHaveLength(0);
      expect(body.data.total).toBe(0);
      expect(body.data.page).toBe(1);
      expect(body.data.pageSize).toBe(20);
      expect(body.data.totalPages).toBe(0);
    });

    it('当分页超过总页数时应返回空数组', async () => {
      vi.mocked(prisma.audit_log.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.audit_log.count).mockResolvedValueOnce(5);

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?page=10&pageSize=10',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.data).toHaveLength(0);
      expect(body.data.total).toBe(5);
      expect(body.data.page).toBe(10);
      expect(body.data.totalPages).toBe(1);
    });
  });

  describe('默认参数测试', () => {
    it('未提供分页参数时应使用默认值', async () => {
      vi.mocked(prisma.audit_log.findMany).mockResolvedValueOnce(
        mockAuditLogs.slice(0, 2)
      );
      vi.mocked(prisma.audit_log.count).mockResolvedValueOnce(
        mockAuditLogs.length
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.page).toBe(1);
      expect(body.data.pageSize).toBe(20);
      expect(body.data.total).toBe(4);
      expect(body.data.totalPages).toBe(1);
    });
  });
});
