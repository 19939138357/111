import { PrismaClient, UserRole, BookCopyStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始播种数据...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 创建用户
  const librarian = await prisma.user_account.upsert({
    where: { username: 'librarian' },
    update: {},
    create: {
      username: 'librarian',
      password_hash: hashedPassword,
      role: UserRole.librarian,
      name: '张馆员',
      email: 'librarian@library.com',
    },
  });

  const reader = await prisma.user_account.upsert({
    where: { username: 'reader' },
    update: {},
    create: {
      username: 'reader',
      password_hash: hashedPassword,
      role: UserRole.reader,
      name: '李读者',
      email: 'reader@example.com',
    },
  });

  const reader2 = await prisma.user_account.upsert({
    where: { username: 'reader2' },
    update: {},
    create: {
      username: 'reader2',
      password_hash: hashedPassword,
      role: UserRole.reader,
      name: '王读者',
      email: 'reader2@example.com',
    },
  });

  console.log('用户创建完成:', librarian.username, reader.username, reader2.username);

  // 创建书籍
  const book1 = await prisma.book_title.upsert({
    where: { isbn: '9787302330608' },
    update: {},
    create: {
      isbn: '9787302330608',
      title: '数据结构',
      author: '严蔚敏, 吴伟民',
      publisher: '清华大学出版社',
      publish_year: 2011,
      category: '计算机科学',
      description: '本书是计算机及相关专业的核心教材之一，全面系统地介绍了数据结构的基本概念、基本方法和基本技术。',
    },
  });

  const book2 = await prisma.book_title.upsert({
    where: { isbn: '9787111213826' },
    update: {},
    create: {
      isbn: '9787111213826',
      title: '算法导论',
      author: 'Thomas H. Cormen',
      publisher: '机械工业出版社',
      publish_year: 2006,
      category: '计算机科学',
      description: '《算法导论》全面地介绍了计算机算法领域的诸多内容，提供了500多道练习题和思考题，适合用作本科生或研究生的算法课程教材。',
    },
  });

  const book3 = await prisma.book_title.upsert({
    where: { isbn: '9787040289985' },
    update: {},
    create: {
      isbn: '9787040289985',
      title: '计算机网络',
      author: '谢希仁',
      publisher: '高等教育出版社',
      publish_year: 2010,
      category: '计算机科学',
      description: '本书是计算机网络课程的经典教材，系统地介绍了计算机网络的基本原理和应用。',
    },
  });

  console.log('书籍创建完成:', book1.title, book2.title, book3.title);

  // 创建复本
  // 数据结构 - 3个复本
  await prisma.book_copy.upsert({
    where: { barcode: 'LIB-001-001' },
    update: {},
    create: {
      book_title_id: book1.id,
      barcode: 'LIB-001-001',
      status: BookCopyStatus.available,
      location: '三楼计算机区-01架',
      condition: '良好',
      rfid_tag: 'RFID-001-001',
    },
  });

  await prisma.book_copy.upsert({
    where: { barcode: 'LIB-001-002' },
    update: {},
    create: {
      book_title_id: book1.id,
      barcode: 'LIB-001-002',
      status: BookCopyStatus.available,
      location: '三楼计算机区-01架',
      condition: '良好',
      rfid_tag: 'RFID-001-002',
    },
  });

  await prisma.book_copy.upsert({
    where: { barcode: 'LIB-001-003' },
    update: {},
    create: {
      book_title_id: book1.id,
      barcode: 'LIB-001-003',
      status: BookCopyStatus.disabled,
      location: '维修中',
      condition: '待修',
      rfid_tag: 'RFID-001-003',
    },
  });

  // 算法导论 - 1个复本
  await prisma.book_copy.upsert({
    where: { barcode: 'LIB-002-001' },
    update: {},
    create: {
      book_title_id: book2.id,
      barcode: 'LIB-002-001',
      status: BookCopyStatus.available,
      location: '三楼计算机区-02架',
      condition: '全新',
      rfid_tag: 'RFID-002-001',
    },
  });

  // 计算机网络 - 1个复本
  await prisma.book_copy.upsert({
    where: { barcode: 'LIB-003-001' },
    update: {},
    create: {
      book_title_id: book3.id,
      barcode: 'LIB-003-001',
      status: BookCopyStatus.available,
      location: '三楼计算机区-03架',
      condition: '良好',
      rfid_tag: 'RFID-003-001',
    },
  });

  console.log('复本创建完成，共5个复本');
  console.log('播种数据完成！');

  console.log('\n======== 测试账号 ========');
  console.log('馆员账号: librarian / password123');
  console.log('读者账号: reader / password123');
  console.log('读者账号2: reader2 / password123');
  console.log('=========================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
