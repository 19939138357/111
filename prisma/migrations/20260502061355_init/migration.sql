-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('reader', 'librarian');

-- CreateEnum
CREATE TYPE "BookCopyStatus" AS ENUM ('available', 'borrowed', 'lost', 'disabled');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('active', 'returned', 'overdue');

-- CreateEnum
CREATE TYPE "FineStatus" AS ENUM ('pending', 'processed', 'waived');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('book_checked_out', 'book_returned', 'fine_processed', 'book_renewed');

-- CreateTable
CREATE TABLE "user_account" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_title" (
    "id" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT,
    "publish_year" INTEGER,
    "category" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_copy" (
    "id" TEXT NOT NULL,
    "book_title_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "status" "BookCopyStatus" NOT NULL DEFAULT 'available',
    "location" TEXT,
    "condition" TEXT,
    "rfid_tag" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_copy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_record" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_copy_id" TEXT NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'active',
    "checkout_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3),
    "renew_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fine_record" (
    "id" TEXT NOT NULL,
    "loan_record_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "FineStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by_id" TEXT,
    "note" TEXT,

    CONSTRAINT "fine_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_username_key" ON "user_account"("username");

-- CreateIndex
CREATE INDEX "user_account_username_idx" ON "user_account"("username");

-- CreateIndex
CREATE UNIQUE INDEX "book_title_isbn_key" ON "book_title"("isbn");

-- CreateIndex
CREATE INDEX "book_title_title_idx" ON "book_title"("title");

-- CreateIndex
CREATE INDEX "book_title_author_idx" ON "book_title"("author");

-- CreateIndex
CREATE UNIQUE INDEX "book_copy_barcode_key" ON "book_copy"("barcode");

-- CreateIndex
CREATE INDEX "book_copy_book_title_id_idx" ON "book_copy"("book_title_id");

-- CreateIndex
CREATE INDEX "book_copy_status_idx" ON "book_copy"("status");

-- CreateIndex
CREATE INDEX "loan_record_user_id_idx" ON "loan_record"("user_id");

-- CreateIndex
CREATE INDEX "loan_record_book_copy_id_idx" ON "loan_record"("book_copy_id");

-- CreateIndex
CREATE INDEX "loan_record_status_idx" ON "loan_record"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fine_record_loan_record_id_key" ON "fine_record"("loan_record_id");

-- CreateIndex
CREATE INDEX "fine_record_user_id_idx" ON "fine_record"("user_id");

-- CreateIndex
CREATE INDEX "fine_record_status_idx" ON "fine_record"("status");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "book_copy" ADD CONSTRAINT "book_copy_book_title_id_fkey" FOREIGN KEY ("book_title_id") REFERENCES "book_title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_record" ADD CONSTRAINT "loan_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_record" ADD CONSTRAINT "loan_record_book_copy_id_fkey" FOREIGN KEY ("book_copy_id") REFERENCES "book_copy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_record" ADD CONSTRAINT "fine_record_loan_record_id_fkey" FOREIGN KEY ("loan_record_id") REFERENCES "loan_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_record" ADD CONSTRAINT "fine_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
