import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { loginSchema, LoginInput } from '../lib/schemas.js';
import { config } from '../lib/config.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: LoginInput }>,
      reply: FastifyReply
    ) => {
      const validated = loginSchema.safeParse(request.body);
      if (!validated.success) {
        return reply.code(400).send({
          error: '参数错误',
          details: validated.error.issues,
        });
      }

      const { username, password } = validated.data;

      const user = await prisma.user_account.findUnique({
        where: { username },
      });

      if (!user) {
        return reply.code(401).send({
          error: '登录失败',
          message: '用户名或密码错误',
        });
      }

      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        return reply.code(401).send({
          error: '登录失败',
          message: '用户名或密码错误',
        });
      }

      const token = app.jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
        },
        { expiresIn: config.jwt.expiresIn }
      );

      return reply.code(200).send({
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email,
          },
        },
      });
    }
  );
}
