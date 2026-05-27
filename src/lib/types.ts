import { UserRole } from '@prisma/client';
import { FastifyRequest } from 'fastify';

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
  username: string;
  role: UserRole;
  userName: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
