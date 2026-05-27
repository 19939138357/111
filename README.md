# 图书馆借阅与馆藏盘点系统 (MVP)

基于 Node.js 20 + Fastify + Prisma + PostgreSQL 构建的图书馆借阅系统 MVP。

## 功能特性

- ✅ **借阅闭环**: 检索书目 → 借出可用复本 → 查看借阅 → 归还 → 超期罚金
- ✅ **复本状态机**: available (可借) → borrowed (已借) → available (归还后)
- ✅ **借阅状态**: active (进行中) → returned (已归还) / overdue (已超期)
- ✅ **RBAC 权限**: reader (读者) + librarian (馆员)
- ✅ **JWT 认证**: 无状态 Token 认证
- ✅ **审计日志**: 借书、还书、续借、罚金处理全记录
- ✅ **Mock Provider**: 邮件、支付、RFID、馆藏同步

## 技术栈

- Node.js 20+ (ESM)
- Fastify 4.x
- Prisma 5.x
- PostgreSQL 15
- Zod (校验)
- @fastify/jwt (认证)

## 数据表

共 6 张核心表：

1. **user_account** - 用户账号 (读者/馆员)
2. **book_title** - 书目信息 (ISBN、书名、作者)
3. **book_copy** - 复本信息 (条码、状态、位置)
4. **loan_record** - 借阅记录 (借出/归还日期、状态)
5. **fine_record** - 罚金记录 (超期天数、金额、状态)
6. **audit_log** - 审计日志 (操作全记录)

## 快速开始

### Docker 一键启动

使用 Dockerfile 构建并启动，包含 PostgreSQL 数据库、自动执行迁移和种子数据、启动后端 API 服务：

```bash
docker build -t library-loan-system .
docker run -d -p 18052:3000 --name docker-question-052 library-loan-system
```

服务启动顺序：
1. PostgreSQL 数据库初始化
2. 自动执行数据库迁移 (`prisma migrate deploy`)
3. 自动播种测试数据 (`prisma db seed`)
4. 后端 API 服务 (端口 3000)

查看容器状态：
```bash
docker ps
```

查看日志：
```bash
docker logs -f docker-question-052
```

停止服务：
```bash
docker stop docker-question-052
docker rm docker-question-052
```

### 访问地址

- API: http://127.0.0.1:18052
- API 文档: http://127.0.0.1:18052/documentation

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 馆员 | librarian | password123 |
| 读者 | reader | password123 |
| 读者 | reader2 | password123 |

## API 概览

共 10 个核心 API：

| # | Method | Endpoint | 角色 | 描述 |
|---|--------|----------|------|------|
| 1 | POST | `/api/auth/login` | 公开 | 登录获取 Token |
| 2 | GET | `/api/books` | 全部 | 书目检索 (关键词/分类) |
| 3 | GET | `/api/books/:bookId` | 全部 | 书目详情与复本列表 |
| 4 | POST | `/api/loans/checkout` | 馆员 | 借出书籍 (事务锁定) |
| 5 | GET | `/api/loans/my` | 全部 | 我的借阅记录 |
| 6 | POST | `/api/loans/:loanId/renew` | 全部 | 续借 (仅 active 且未超期) |
| 7 | POST | `/api/loans/:loanId/return` | 馆员 | 归还书籍 (超期生成罚金) |
| 8 | GET | `/api/fines` | 全部 | 罚金列表 (读者仅见自己的) |
| 9 | POST | `/api/fines/:fineId/process` | 馆员 | 登记罚金已处理 |
| 10 | GET | `/api/audit-logs` | 馆员 | 审计日志查询 |

## cURL 示例

### 1. 登录 (获取 Token)

```bash
# 馆员登录
curl -X POST http://127.0.0.1:18052/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"librarian","password":"password123"}'

# 读者登录
curl -X POST http://127.0.0.1:18052/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"reader","password":"password123"}'
```

### 2. 检索书目

```bash
READER_TOKEN="your_jwt_token_here"

curl -X GET "http://127.0.0.1:18052/api/books?keyword=数据结构" \
  -H "Authorization: Bearer $READER_TOKEN"
```

### 3. 查看书目详情

```bash
curl -X GET "http://127.0.0.1:18052/api/books/$BOOK_ID" \
  -H "Authorization: Bearer $READER_TOKEN"
```

### 4. 借书 (馆员操作)

```bash
LIBRARIAN_TOKEN="your_jwt_token_here"

curl -X POST http://127.0.0.1:18052/api/loans/checkout \
  -H "Authorization: Bearer $LIBRARIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"读者ID","barcode":"LIB-001-001"}'
```

### 5. 查看我的借阅

```bash
curl -X GET "http://127.0.0.1:18052/api/loans/my" \
  -H "Authorization: Bearer $READER_TOKEN"
```

### 6. 续借

```bash
curl -X POST "http://127.0.0.1:18052/api/loans/$LOAN_ID/renew" \
  -H "Authorization: Bearer $READER_TOKEN"
```

### 7. 还书 (馆员操作)

```bash
curl -X POST "http://127.0.0.1:18052/api/loans/$LOAN_ID/return" \
  -H "Authorization: Bearer $LIBRARIAN_TOKEN"
```

### 8. 查看罚金

```bash
curl -X GET "http://127.0.0.1:18052/api/fines" \
  -H "Authorization: Bearer $READER_TOKEN"
```

### 9. 登记罚金已处理 (馆员操作)

```bash
curl -X POST "http://127.0.0.1:18052/api/fines/$FINE_ID/process" \
  -H "Authorization: Bearer $LIBRARIAN_TOKEN"
```

### 10. 查看审计日志

```bash
curl -X GET "http://127.0.0.1:18052/api/audit-logs" \
  -H "Authorization: Bearer $LIBRARIAN_TOKEN"
```

## 配置

环境变量:

```env
DATABASE_URL="postgresql://library_user:library_password@localhost:5432/library_db?schema=public"
JWT_SECRET="library-jwt-secret-key-change-in-production-123456"
JWT_EXPIRES_IN="24h"
PORT=3000
```

## 项目结构

```
├── prisma/
│   ├── schema.prisma     # 数据库模型
│   ├── migrations/       # 数据库迁移文件
│   └── seed.ts           # 测试数据
├── src/
│   ├── lib/
│   │   ├── config.ts     # 配置
│   │   ├── prisma.ts     # Prisma Client
│   │   ├── schemas.ts    # Zod 校验
│   │   └── types.ts      # 类型定义
│   ├── middleware/
│   │   └── auth.ts       # JWT + RBAC 认证
│   ├── mock/
│   │   └── providers.ts  # Mock 服务
│   ├── routes/
│   │   ├── auth.ts       # 登录 API
│   │   ├── books.ts      # 书目 API
│   │   ├── loans.ts      # 借阅 API
│   │   ├── fines.ts      # 罚金 API
│   │   └── audit.ts      # 审计日志 API
│   ├── services/
│   │   ├── loan.ts       # 借阅服务 (事务/状态机)
│   │   └── audit.ts      # 审计服务
│   └── server.ts         # 入口文件
├── tests/                # 测试文件
├── Dockerfile            # Docker 构建文件
├── start.sh              # 容器启动脚本
└── package.json
```

## License

MIT
