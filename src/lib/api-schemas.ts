import { z } from 'zod';

export const commonSchemas = {
  id: z.string().min(1, 'id 不能为空'),
  source: z.string().min(1, 'source 不能为空'),
  keyword: z.string().min(1, 'keyword 不能为空'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  token: z.string().min(1, 'token 不能为空'),
  url: z.string().url('URL 格式无效'),
  username: z.string().min(1, 'username 不能为空'),
  password: z.string().min(1, 'password 不能为空'),
};

export const detailQuerySchema = z.object({
  id: commonSchemas.id,
  source: commonSchemas.source,
});

export const searchQuerySchema = z.object({
  keyword: commonSchemas.keyword,
  page: commonSchemas.page,
  source: z.string().optional(),
});

export const paginatedQuerySchema = z.object({
  page: commonSchemas.page,
  pageSize: commonSchemas.pageSize,
});
