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

export const proxyUrlSchema = z.object({
  url: z.string().min(1, 'url 不能为空'),
  source: z.string().min(1, 'source 不能为空').optional(),
});

export const loginBodySchema = z.object({
  username: z.string().optional(),
  password: z.string().min(1, 'password 不能为空'),
  turnstileToken: z.string().optional(),
});

export const registerBodySchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/, '用户名只能包含字母、数字、下划线，长度3-20位'),
  password: z.string().min(6, '密码至少6个字符').max(100, '密码最多100个字符'),
  turnstileToken: z.string().optional(),
});

export const changePasswordBodySchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6个字符').max(100, '新密码最多100个字符'),
});
