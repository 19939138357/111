import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export const bookSearchSchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const bookIdSchema = z.object({
  bookId: z.string().cuid('无效的书目ID'),
});

export const checkoutSchema = z.object({
  userId: z.string().cuid('无效的用户ID'),
  barcode: z.string().min(1, '条码号不能为空'),
});

export const loanIdSchema = z.object({
  loanId: z.string().cuid('无效的借阅记录ID'),
});

export const returnBookSchema = z.object({
  loanId: z.string().cuid('无效的借阅记录ID'),
});

export const renewSchema = z.object({
  loanId: z.string().cuid('无效的借阅记录ID'),
});

export const fineListSchema = z.object({
  userId: z.string().cuid('无效的用户ID').optional(),
  status: z.enum(['pending', 'processed', 'waived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const fineProcessSchema = z.object({
  fineId: z.string().cuid('无效的罚金ID'),
});

export const auditLogListSchema = z.object({
  action: z.enum(['book_checked_out', 'book_returned', 'fine_processed', 'book_renewed']).optional(),
  actorName: z.string().min(1).optional(),
  targetType: z.enum(['loan_record', 'fine_record']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type BookSearchInput = z.infer<typeof bookSearchSchema>;
export type BookIdInput = z.infer<typeof bookIdSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type LoanIdInput = z.infer<typeof loanIdSchema>;
export type ReturnBookInput = z.infer<typeof returnBookSchema>;
export type RenewInput = z.infer<typeof renewSchema>;
export type FineListInput = z.infer<typeof fineListSchema>;
export type FineProcessInput = z.infer<typeof fineProcessSchema>;
export type AuditLogListInput = z.infer<typeof auditLogListSchema>;
