# MoonTVPlus 代码审查报告

## 项目概览

基于 **Next.js 15 + React 19** 的影视聚合平台，支持多种存储后端（SQLite/PostgreSQL/Redis/D1/Upstash/Kvrocks），功能涵盖视频搜索、弹幕、直播、音乐、AI助手等。项目规模：100+ API 路由、80+ 组件、60+ lib 模块。

---

## 🔴 严重问题（需立即修复）

### 1. `eval()` 使用 — 远程代码执行风险

**位置**: `src/lib/source-script.ts:13`, `src/app/api/music/route.ts:310,397`

```ts
// source-script.ts
const _nodeRequire = eval('require') as NodeRequire;

// music/route.ts
result = eval(result);
const transformFn = eval(`(${config.transform})`);
```

**风险**: `source-script.ts` 使用 `eval('require')` 绕过 webpack 静态分析，让用户提交的脚本可以访问完整的 Node.js `require`，意味着脚本可以执行任意系统命令（`require('child_process').exec()`）。`music/route.ts` 中的 `eval` 直接执行用户配置的转换表达式。

**建议**:
- `source-script.ts`: 使用 `vm2` 或 `isolated-vm` 在沙箱中执行用户脚本，限制可访问的模块白名单
- `music/route.ts`: 使用安全的表达式解析器（如 `jsonata` 或 `expr-eval`）替代 `eval`
- 如果必须保留动态执行，至少添加严格的输入校验和权限限制

---

### 2. Cookie 明文密码（已部分修复，仍有残留风险）

**位置**: `src/app/api/login/route.ts:38,44-45`

代码注释表明 `includePassword` 参数已不再存储明文密码到 Cookie（改用 HMAC 签名验证），但参数仍保留在函数签名中，存在被未来开发者误用的风险。

```ts
// note: includePassword parameter is retained for backward compatibility
// but password is NEVER stored in the cookie — only validated server-side
```

**建议**:
- 标记 `includePassword` 参数为 `@deprecated`，添加 JSDoc 说明
- 设置迁移计划，下一版本移除该参数
- localStorage 模式也应强制使用 HMAC 签名，而非存储明文密码

---

### 3. Cron 端点认证（已改进，仍有风险）

**位置**: `src/app/api/cron/[password]/route.ts:169-217`

改进点：已移除默认密码，改用 `process.env.CRON_PASSWORD` 必须配置；已支持 `Authorization: Bearer` 头部认证；已添加速率限制（15分钟窗口5次失败）。

残留风险：
- URL 路径参数仍作为 fallback 认证方式，密码会被记录在访问日志中
- `console.log(request.url)` 在第 189 行会打印完整 URL（含密码参数）

```ts
console.log(request.url); // 第189行，会泄露密码到日志
```

**建议**:
- 移除第 189 行的 `console.log(request.url)`
- 下一版本完全移除 URL 路径参数认证，仅保留 Bearer Token
- 使用 `crypto.timingSafeEqual()` 替代 `!==` 进行密码比较，防止时序攻击

---

## 🟠 重要问题（建议尽快修复）

### 4. `config.ts` 过于庞大 — 近 1000 行

**位置**: `src/lib/config.ts`

承担了太多职责：配置解析、环境变量覆盖、自检、迁移、缓存管理、API 站点过滤等。

**建议**:
- 拆分为独立模块：`config/parser.ts`、`config/env-overrides.ts`、`config/self-check.ts`、`config/cache.ts`
- `configSelfCheck()` 函数中大量重复的 `if (xxx === undefined) { xxx = defaultValue }` 模式，可以用一个默认值对象 + 深度合并来替代

---

### 5. `as any` 滥用 — 316+ 处

整个代码库中有 316+ 处 `as any` 类型断言，其中 `db.ts` 中约 110 处，API 路由中 63+ 处。这完全绕过了 TypeScript 的类型安全。

**典型示例**:
```ts
// data_migration/import/route.ts
const storage = (db as any).storage;
(db as any).storage.setPlayRecord(username, key, record);

// admin/source/route.ts
(body as any)._batchDeleteResult = { deleted: keysToDelete.length, ... };
```

**建议**:
- 优先使用更精确的类型断言：`as unknown as TargetType` 或定义合适的接口
- 对 `db.ts` 中的存储适配器定义统一的类型接口，而非到处 `as any`
- 逐步减少 `as any`，设置 CI 门禁限制新增 `as any`

---

### 6. `eslint-disable` 泛滥 — 105+ 处

100+ 个文件中有 105+ 处 `eslint-disable`，很多是文件级别的全局禁用：

```ts
/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion */
```

**建议**:
- 使用行内 `// eslint-disable-next-line` 替代文件级禁用，精确控制范围
- 将 `no-console` 规则改为 warn 级别，而非完全禁用
- 引入统一的日志工具替代 `console.log`

---

### 7. 内存缓存无上限控制

**位置**: `src/lib/openlist-cache.ts:17-18`, `src/lib/user-cache.ts:16,61`

多个模块使用 `Map` 做内存缓存：

| 模块 | 大小限制 | TTL | 清理机制 |
|------|----------|-----|----------|
| `search-cache.ts` | MAX_CACHE_SIZE=1000 | 有 | 有 |
| `user-cache.ts` (UserInfoCache) | 无上限 | 6h | 每1分钟定时清理 |
| `user-cache.ts` (OwnerExistenceCache) | 无上限 | 10min | 每1分钟定时清理 |
| `openlist-cache.ts` (METAINFO) | 无上限 | 7天 | 仅访问时惰性清理 |
| `openlist-cache.ts` (VIDEOINFO) | 无上限 | 1天 | 仅访问时惰性清理 |

**风险**: 长时间运行且高并发场景下，`openlist-cache.ts` 可能积累大量未访问但未清理的条目，导致内存泄漏。

**建议**:
- 所有内存缓存统一使用 LRU 缓存（如 `lru-cache` 库）
- 或提取一个通用的 `BoundedMap` 工具类，内置大小限制和 TTL 清理
- `openlist-cache.ts` 中的 VIDEOINFO_CACHE 特别需要添加大小限制

---

### 8. `console.log` 泛滥 — 782+ 处

生产代码中有 782+ 处 `console.log/warn/error`，大量是调试日志。cron 路由中还有 `console.log(request.url)` 泄露认证信息。

**建议**:
- 引入结构化日志库（如 `pino` 或 `winston`）
- 区分日志级别：开发环境输出 debug，生产环境只输出 warn/error
- 敏感信息（如用户名、token、完整 URL）不应出现在日志中

---

### 9. 图片代理完全开放

**位置**: `next.config.js:22-34`

```js
images: {
  unoptimized: true,
  remotePatterns: [
    { protocol: 'https', hostname: '**' },
    { protocol: 'http', hostname: '**' },
  ],
},
```

允许代理任意域名图片，可能被滥用为开放代理。

**建议**: 限制为已知需要的域名白名单，或至少排除内网 IP 段防止 SSRF。

---

## 🟡 一般问题（建议改进）

### 10. 签名生成函数重复实现

`generateSignature` 函数在以下文件中重复实现：
- `src/middleware.ts`
- `src/lib/middleware-auth.ts`
- `src/app/api/login/route.ts`
- `src/app/api/auth/oidc/callback/route.ts`

**建议**: 提取到 `lib/crypto.ts` 或 `lib/signature.ts` 中统一使用。

---

### 11. `STORAGE_TYPE` 重复读取

`process.env.NEXT_PUBLIC_STORAGE_TYPE` 在 10+ 个文件中重复读取和解析：

```ts
const STORAGE_TYPE = (process.env.NEXT_PUBLIC_STORAGE_TYPE as ...) || 'localstorage';
```

**建议**: 在 `config.ts` 或 `db.ts` 中导出一个单例常量，其他文件引用即可。

---

### 12. API 路由缺少统一的请求验证层

大部分 API 路由手动解析请求体和验证参数，没有统一的验证中间件。

**建议**:
- 使用 Zod（项目已引入）定义请求 schema，在路由处理前统一验证
- 可以创建一个 `withValidation` 高阶函数包装路由处理器

---

### 13. `dangerouslySetInnerHTML` 使用

**位置**:
- `src/components/DataMigration.tsx:112` — 渲染迁移提示 HTML
- `src/app/layout.tsx:265` — 注入 `window.RUNTIME_CONFIG`

`layout.tsx` 中的 `JSON.stringify(runtimeConfig)` 如果配置值含恶意字符串，可能导致 XSS。

**建议**:
- `layout.tsx`: 对 `runtimeConfig` 的值进行 HTML 转义
- `DataMigration.tsx`: 使用 DOMPurify 清洗 HTML 内容

---

### 14. 前端 `localStorage.setItem` 使用过多 — 122 处

`UserMenu.tsx` 中有 60 处 `localStorage.setItem` 调用，`db.client.ts` 中 19 处，`play/page.tsx` 中 11 处。

**风险**: localStorage 没有容量限制保护，超出浏览器配额（通常 5-10MB）会抛出异常导致功能崩溃。敏感数据（如用户信息）明文存储可被 XSS 窃取。

**建议**:
- 使用 `try-catch` 包裹所有 `localStorage.setItem` 调用
- 考虑使用 `localStorage` 封装库，统一处理配额超限和序列化
- 敏感数据（认证信息）应使用 `httpOnly` Cookie

---

### 15. 前端 fetch URL 模板拼接 — 18 处

18 个组件使用 `fetch(\`...\${variable}\`)` 模式拼接 URL，如果变量来自用户输入，可能导致 SSRF 或路径遍历。

**涉及文件**: `DetailPanel.tsx`, `CorrectDialog.tsx`, `AnimeSubscriptionComponent.tsx`, `AIComments.tsx`, `admin/page.tsx` 等。

**建议**: 对用户输入的 URL 参数进行校验和编码，使用 `encodeURIComponent()` 包裹。

---

### 16. 缺少测试覆盖

虽然有 Jest 配置，但 `src` 下没有 `__tests__` 目录或测试文件。

**建议**:
- 至少对核心模块（认证、配置、数据库适配器）添加单元测试
- 对关键 API 路由添加集成测试
- 设置 CI 中的测试覆盖率门禁

---

## 🟢 架构建议

### 17. 服务层抽象不完整

项目有 `src/services/` 目录（4个文件），但大量业务逻辑仍然直接写在 API 路由中（如 `cron/[password]/route.ts` 有 938 行代码）。

**建议**: 将业务逻辑从路由处理器中提取到 service 层，路由只负责请求解析、验证和响应格式化。

---

### 18. 数据库适配器接口不统一

`IStorage` 接口定义在 `types.ts` 中，但实际使用中大量 `(db as any).storage.xxx` 调用，说明接口定义不完整或实现不一致。

**建议**:
- 完善 `IStorage` 接口，覆盖所有实际使用的方法
- 各适配器实现严格遵循接口，消除 `as any`

---

### 19. 错误处理不一致

有些 API 返回 `apiError()`，有些直接 `throw`，有些返回原始 `NextResponse.json()`。

**建议**: 统一使用 `apiError/apiSuccess` 响应格式，添加全局错误处理中间件。

---

### 20. 数据库连接池缺失

搜索结果中未发现任何 `max_connections`、`connectionLimit`、`poolSize` 配置。在 PostgreSQL/Redis 模式下，没有连接池管理可能导致连接泄漏。

**建议**:
- 为 PostgreSQL 模式配置连接池（如 `pg` 的 `Pool` 或 `@vercel/postgres` 的默认池）
- 为 Redis 模式确认连接复用策略
- 添加连接超时和重试机制

---

## 📊 量化总结

| 指标 | 数值 | 严重程度 |
|------|------|----------|
| `eval()` 使用 | 3 处 | 🔴 严重 |
| 明文密码存储残留 | 1 处 | 🔴 严重 |
| Cron 端点日志泄露 | 1 处 | 🔴 严重 |
| `as any` 类型断言 | 316+ 处 | 🟠 重要 |
| `eslint-disable` | 105+ 处 | 🟠 重要 |
| `console.log` | 782+ 处 | 🟠 重要 |
| 内存缓存无上限 | 4 处 | 🟠 重要 |
| 图片代理完全开放 | 1 处 | 🟠 重要 |
| `localStorage.setItem` | 122 处 | 🟡 一般 |
| `dangerouslySetInnerHTML` | 2 处 | 🟡 一般 |
| fetch URL 拼接 | 18 处 | 🟡 一般 |
| 重复代码（签名函数等） | 4+ 处 | 🟡 一般 |
| 测试文件 | ~0 | 🟠 重要 |
| 数据库连接池配置 | 0 | 🟡 一般 |

---

## 🏆 优先修复建议（按影响排序）

1. **移除 Cron 路由中的 `console.log(request.url)`** — 修复认证信息泄露（最简单、最紧急）
2. **沙箱化 `source-script.ts` 的脚本执行** — 最大的安全风险
3. **移除 Cookie 中的明文密码残留** — 标记 `includePassword` 为 deprecated
4. **加固 Cron 端点认证** — 使用 `timingSafeEqual` 替代 `!==`
5. **拆分 `config.ts`** — 提高可维护性
6. **引入结构化日志** — 替代 `console.log`，控制日志级别
7. **统一内存缓存策略** — 使用 LRU 缓存，防止内存泄漏
8. **添加核心模块测试** — 认证、配置、数据库适配器
9. **逐步消除 `as any`** — 从 `db.ts` 开始，定义完整接口
10. **限制图片代理域名** — 防止被滥用为开放代理

---

## ✅ 项目亮点

- SSRF 防护（`src/lib/server/ssrf.ts`）做得不错
- API 响应格式统一（`src/lib/api-response.ts`）
- Token 刷新机制设计合理
- Cron 端点已添加速率限制和冷却机制
- 已移除 Cron 默认密码，强制配置
- 认证 Cookie 已改用 HMAC 签名
