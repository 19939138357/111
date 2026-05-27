import { BookCopyStatus, LoanStatus, Prisma, PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { config } from '../lib/config.js';

export function getDueDate(checkoutDate?: Date): Date {
  const date = checkoutDate || new Date();
  const dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + config.loan.defaultLoanDays);
  return dueDate;
}

export function calculateOverdueDays(
  dueDate: Date,
  returnDate?: Date
): number {
  const effectiveReturnDate = returnDate || new Date();
  const diffTime = effectiveReturnDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function calculateFineAmount(overdueDays: number): number {
  return overdueDays * config.loan.finePerDay;
}

interface LockedBookCopy {
  id: string;
  book_title_id: string;
  barcode: string;
  status: string;
  location: string | null;
  condition: string | null;
  rfid_tag: string | null;
  created_at: Date;
  updated_at: Date;
}

interface LockedLoanRecord {
  id: string;
  user_id: string;
  book_copy_id: string;
  status: string;
  checkout_date: Date;
  due_date: Date;
  return_date: Date | null;
  renew_count: number;
  created_at: Date;
  updated_at: Date;
}

export async function checkOutBook(
  userId: string,
  barcode: string,
  actorId: string,
  actorName: string
): Promise<{
  loan: Prisma.loan_recordGetPayload<{
    include: { book_copy: { include: { book_title: true } } };
  }>;
}> {
  const result = await prisma.$transaction(
    async (tx) => {
      const lockedCopies = await tx.$queryRaw<LockedBookCopy[]>`
        SELECT * FROM book_copy 
        WHERE barcode = ${barcode} 
        FOR UPDATE
      `;

      console.log(`[RowLock] SELECT FOR UPDATE 锁定复本: barcode=${barcode}, rows=${lockedCopies.length}`);

      if (lockedCopies.length === 0) {
        throw new Error('复本不存在');
      }

      const lockedCopy = lockedCopies[0];

      if (lockedCopy.status !== BookCopyStatus.available) {
        throw new Error(`复本当前状态为 ${lockedCopy.status}，不可借阅`);
      }

      const user = await tx.user_account.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('读者不存在');
      }

      const bookTitle = await tx.book_title.findUnique({
        where: { id: lockedCopy.book_title_id },
      });

      if (!bookTitle) {
        throw new Error('书目不存在');
      }

      await tx.book_copy.update({
        where: { id: lockedCopy.id },
        data: { status: BookCopyStatus.borrowed },
      });

      const dueDate = getDueDate();

      const loan = await tx.loan_record.create({
        data: {
          user_id: userId,
          book_copy_id: lockedCopy.id,
          status: LoanStatus.active,
          checkout_date: new Date(),
          due_date: dueDate,
        },
        include: {
          book_copy: {
            include: {
              book_title: true,
            },
          },
        },
      });

      console.log(`[RowLock] 复本 ${barcode} 锁定成功，状态从 available 更新为 borrowed`);
      
      const bookCopyWithTitle = {
        ...lockedCopy,
        book_title: bookTitle,
        book_title_id: undefined as unknown as string,
      } as unknown as Prisma.book_copyGetPayload<{ include: { book_title: true } }>;

      return { loan, bookCopy: bookCopyWithTitle };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );

  return result;
}

export async function returnBook(
  loanId: string,
  actorId: string,
  actorName: string
): Promise<{
  loan: Prisma.loan_recordGetPayload<{
    include: { book_copy: { include: { book_title: true } } };
  }>;
  overdueDays: number;
  fineCreated: boolean;
  fineAmount: number;
}> {
  const result = await prisma.$transaction(
    async (tx) => {
      const lockedLoans = await tx.$queryRaw<LockedLoanRecord[]>`
        SELECT * FROM loan_record 
        WHERE id = ${loanId} 
        FOR UPDATE
      `;

      console.log(`[RowLock] SELECT FOR UPDATE 锁定借阅记录: loanId=${loanId}, rows=${lockedLoans.length}`);

      if (lockedLoans.length === 0) {
        throw new Error('借阅记录不存在');
      }

      const lockedLoan = lockedLoans[0];

      if (
        lockedLoan.status !== LoanStatus.active &&
        lockedLoan.status !== LoanStatus.overdue
      ) {
        if (lockedLoan.status === LoanStatus.returned) {
          throw new Error('该书已归还');
        }
        throw new Error(`借阅记录状态为 ${lockedLoan.status}，无法归还`);
      }

      const lockedCopies = await tx.$queryRaw<LockedBookCopy[]>`
        SELECT * FROM book_copy 
        WHERE id = ${lockedLoan.book_copy_id} 
        FOR UPDATE
      `;

      console.log(`[RowLock] SELECT FOR UPDATE 锁定复本: copyId=${lockedLoan.book_copy_id}, rows=${lockedCopies.length}`);

      const returnDate = new Date();
      const overdueDays = calculateOverdueDays(lockedLoan.due_date, returnDate);
      let fineCreated = false;
      let fineAmount = 0;

      if (overdueDays > 0) {
        fineAmount = calculateFineAmount(overdueDays);
        const existingFine = await tx.fine_record.findUnique({
          where: { loan_record_id: lockedLoan.id },
        });

        if (!existingFine) {
          await tx.fine_record.create({
            data: {
              loan_record_id: lockedLoan.id,
              user_id: lockedLoan.user_id,
              amount: fineAmount,
              reason: `超期 ${overdueDays} 天`,
              status: 'pending',
            },
          });
          fineCreated = true;
        }
      }

      await tx.book_copy.update({
        where: { id: lockedLoan.book_copy_id },
        data: { status: BookCopyStatus.available },
      });

      const newStatus = overdueDays > 0 ? LoanStatus.overdue : LoanStatus.returned;

      const updatedLoan = await tx.loan_record.update({
        where: { id: loanId },
        data: {
          status: newStatus,
          return_date: returnDate,
        },
        include: {
          book_copy: {
            include: {
              book_title: true,
            },
          },
        },
      });

      console.log(`[RowLock] 借阅记录 ${loanId} 已归还，超期 ${overdueDays} 天，复本状态恢复为 available`);
      return {
        loan: updatedLoan,
        overdueDays,
        fineCreated,
        fineAmount,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );

  return result;
}

export async function renewLoan(
  loanId: string,
  userId: string,
  actorId: string,
  actorName: string
): Promise<{
  loan: Prisma.loan_recordGetPayload<{
    include: { book_copy: { include: { book_title: true } } };
  }>;
}> {
  const result = await prisma.$transaction(
    async (tx) => {
      const lockedLoans = await tx.$queryRaw<LockedLoanRecord[]>`
        SELECT * FROM loan_record 
        WHERE id = ${loanId} 
        FOR UPDATE
      `;

      console.log(`[RowLock] SELECT FOR UPDATE 锁定借阅记录: loanId=${loanId}, rows=${lockedLoans.length}`);

      if (lockedLoans.length === 0) {
        throw new Error('借阅记录不存在');
      }

      const lockedLoan = lockedLoans[0];

      if (lockedLoan.user_id !== userId) {
        throw new Error('无权操作此借阅记录');
      }

      if (lockedLoan.status !== LoanStatus.active) {
        throw new Error('只有活动中的借阅记录可以续借');
      }

      const now = new Date();
      if (now > lockedLoan.due_date) {
        throw new Error('超期的借阅记录不可续借，请先归还并处理罚金');
      }

      if (lockedLoan.renew_count >= config.loan.maxRenewCount) {
        throw new Error(`已达到最大续借次数 (${config.loan.maxRenewCount} 次)`);
      }

      const newDueDate = getDueDate(lockedLoan.due_date);

      const updatedLoan = await tx.loan_record.update({
        where: { id: loanId },
        data: {
          renew_count: lockedLoan.renew_count + 1,
          due_date: newDueDate,
        },
        include: {
          book_copy: {
            include: {
              book_title: true,
            },
          },
        },
      });

      console.log(`[RowLock] 借阅记录 ${loanId} 已续借，新到期日: ${newDueDate}`);
      return { loan: updatedLoan };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );

  return result;
}
