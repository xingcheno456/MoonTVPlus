# MoonTVplus 深度代码审查报告

> 审查日期: 2026-04-27 | 审查范围: 全仓代码

---

## 项目概览

MoonTVplus 是一个基于 Next.js 15.5 的视频聚合和流媒体平台（Netflix-like 前端），聚合第三方 Apple CMS V10 格式的视频源 API。特性包括：多源聚合搜索、弹幕、Anime4K WebGPU 超分、观影室（WebSocket/WebRTC）、M3U8 下载、私有库集成（Emby/OpenList/Xiaoya）、PWA、AI 聊天、音乐播放等。

| 层级 | 技术栈 |
|------|--------|
| 框架 | Next.js 15.5 (App Router, TypeScript) |
| UI | React 19, Tailwind CSS 3, Framer Motion |
| 视频播放 | ArtPlayer v5, HLS.js, FLV.js |
| 实时通信 | Socket.IO v4, WebRTC |
| 存储 | Redis / Upstash / Kvrocks / SQLite / D1 / Postgres |
| 测试 | Jest (已配置，无测试文件) |

---

## 1. 安全问题修复（已应用）

### 1.1 `source-script.ts` — vm.Script 远程代码执行 (CVE 级，严重)

**风险**: `vm.Script` 不是安全沙箱。Node.js 文档明确声明 "不要用它运行不受信任的代码"。管理员可通过注入脚本获取服务器完整控制权。

**修复**: 将 `vm.Script` 替换为 `worker_threads` 隔离执行，配置资源限制（最大 128MB 堆内存、32MB 新生代、4MB 栈）、超时终止和清理机制。
- 文件: `src/lib/source-script.ts:297-364`
- 影响: `getOrCompileScript` 改为 async，3 个调用点已同步更新

### 1.2 `server.js` — Socket.IO CORS `origin: '*'`

**风险**: 任何网站可连接 WebSocket 服务器，劫持观影室聊天、播放状态、屏幕共享。

**修复**: CORS origin 限制为 `NEXT_PUBLIC_SITE_URL` 或本地地址。
- 文件: `server.js:660-665`

### 1.3 `server.js` — 观影室密码明文存储/Math.random() 房间 ID

**风险**: 1) 密码在内存中明文存储，堆转储可泄露；2) `Math.random()` 可预测，房间 ID 可暴力枚举。

**修复**: 密码使用 PBKDF2-SHA512 (100000 迭代) 存储哈希值，验证时使用 `timingSafeEqual` 常量时间比较；房间 ID 改用 `crypto.randomBytes`。
- 文件: `server.js:70-95, 125-132, 615-621`

### 1.4 `layout.tsx` — `dangerouslySetInnerHTML` XSS 注入

**风险**: 数据库配置值（Admin 面板可控）被注入到内联 `<script>` 标签。`</script>` 序列可突破 JSON.stringify 的转义闭合 `<script>` 标签，注入恶意脚本。

**修复**: 运行时配置改为 base64 编码存入 `<meta>` 标签，通过独立的小脚本读取解码。这是防御性更强的模式，不受 HTML 解析器对 `<script>` 内容特殊解析的影响。
- 文件: `src/app/layout.tsx:259-275`

### 1.5 `cron/[password]/route.ts` — 密码在 URL 路径泄露

**风险**: 密码作为 URL 路径参数，会出现在 Nginx/Vercel/Cloudflare 访问日志中。

**修复**: 移除 URL 路径密码回退，仅接受 `Authorization: Bearer` 头认证。
- 文件: `src/app/api/cron/[password]/route.ts:185-201`

### 1.6 `cron/[password]/route.ts` — X-Forwarded-For 可伪造绕过速率限制

**风险**: `X-Forwarded-For` 请求头可被客户端任意设置，每次请求换 IP 即可绕过。

**修复**: 仅在设置 `TRUSTED_PROXY=true` 时信任 `CF-Connecting-IP` / `x-real-ip`，否则使用连接 IP。
- 文件: `src/app/api/cron/[password]/route.ts:202`

### 1.7 `login/route.ts` — Auth Cookie 非 HttpOnly 非 Secure

**风险**: `httpOnly: false` 让 XSS 可直接窃取 cookie；`secure: false` 在 HTTP 上传输。

**修复**: 所有登录路径的 cookie 设置改为 `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`。
- 文件: `src/app/api/login/route.ts:200-206, 260-266, 310-315`

### 1.8 `crypto.ts` — CryptoJS 弱密钥派生

**风险**: CryptoJS 内部 KD F 基于单次 MD5 迭代，ECB 模式，不适用于生产环境。

**修复**: 替换为 Node.js 原生 `crypto` 模块：AES-256-GCM + PBKDF2 (600000 迭代, SHA-256)；HMAC 直接使用 `crypto.createHmac`。移除 `crypto-js` 依赖。
- 文件: `src/lib/crypto.ts`（全文重写）
- 依赖: 从 `package.json` 移除 `crypto-js` 和 `@types/crypto-js`

---

## 2. 代码质量问题修复（已应用）

### 2.1 Admin Routes — 错误响应使用 `apiSuccess`

**风险**: 5 个 admin 路由在 catch 块中用 `apiSuccess({error:...}, {status:500})` 返回错误。客户端检查 `response.success === true` 会误判 500 错误为成功。

**修复**: 全部改为 `apiError(message, 500)`。
- 文件: `src/app/api/admin/{user,source,site,reset,users}/route.ts`

### 2.2 `db.ts` — `null as unknown as IStorage` 类型洞

**风险**: `localstorage` 模式返回 `null` 强转为 `IStorage`，服务端调用会 NPE。

**修复**: 改为抛出明确错误信息，指出 localstorage 仅用于客户端。
- 文件: `src/lib/db.ts:64-66`

### 2.3 `package.json` — 跨平台脚本兼容性

**修复**:
- `db:reset`: `rm -f` 替换为跨平台 `node -e` 文件删除
- `start`: `NODE_ENV=production` Unix 语法替换为 `node -e` 设置环境变量
- `postbuild`: 移除占位 echo 脚本
- 移除未使用的依赖 `crypto-js`, `@types/crypto-js`

---

## 3. 仍需关注的代码质量问题（建议修复）

以下问题较严重但修复工作量较大，未在本次修复中处理，建议按优先级逐步改进。

> **审查日期**: 2026-04-27 | 状态: 🔴 未修改 🟡 部分改善 🟢 已修复

### 3.1 🔴 高优先级（架构级问题）

#### 3.1.1 `layout.tsx` "上帝函数" (200+ 行) 🔴 未修改

`src/app/layout.tsx:47-248` 的 `RootLayout` 函数长达 **200+ 行**，包含 30+ 个 `let` 变量声明、大量条件配置读取逻辑、以及运行时配置注入。这使它难以测试和维护。

**当前状态**: 未重构。配置读取逻辑仍内嵌在 RootLayout 中。

**建议**:
- 提取 `getRuntimeConfig()` 函数到 `lib/config/runtime-config.ts`，将配置聚合逻辑独立
- 提取 `FeatureFlags` 类型定义，替代松散的 `runtimeConfig` 对象
- 将配置读取移到 `lib/config.ts` 中统一管理

#### 3.1.2 `AdminConfig` 类型过于庞大 (291 行) 🔴 未修改

`src/lib/admin.types.ts` 中的 `AdminConfig` 是一个巨型接口（291 行），嵌套了 SiteConfig、UserConfig、SourceConfig、LiveConfig、WebLiveConfig、ThemeConfig、OpenListConfig、NetDiskConfig、AIConfig、EmbyConfig、XiaoyaConfig、MusicConfig、EmailConfig、AnimeSubscriptionConfig 等 **14 个子配置**，且部分子配置内部字段极多（如 AIConfig 有 40+ 字段）。

**当前状态**: 未拆分，所有子配置仍在单一文件中。

**建议**:
```text
src/lib/config/
  types/
    site.ts
    source.ts
    ai.ts
    emby.ts
    theme.ts
    music.ts
    ...
  index.ts  # 通过组合模式重新导出
```

#### 3.1.3 `any` 类型泛滥 — db.ts 单文件 111 处 🔴 未修改

整个 `src/lib/` 中 `any` 出现数百次，其中 `db.ts` 单文件就有 **111 处** `(this.storage as any).methodName` 模式。大量 `eslint-disable @typescript-eslint/no-explicit-any` 文件级注释（**60+ 个文件**）掩盖了类型安全问题。

**当前状态**: 未修改。所有 `as any` 和文件级 disable 仍存在。

**建议**:
- 优先为 `IStorage` 定义 `IStorageV2` 扩展接口，包含所有 V2 方法签名
- 用 `unknown` 替代 `any`，强制调用方做类型检查
- 逐步移除文件级 `eslint-disable` 注释，改为行级或通过 `.eslintrc` 配置例外

#### 3.1.4 `eslint-disable` 注释过多 — 101 处 🟡 部分改善

100 个文件中存在 **101 处** 文件级 `eslint-disable`，最常见的组合是 `@typescript-eslint/no-explicit-any`（60+ 文件）、`react-hooks/exhaustive-deps`、`@typescript-eslint/no-non-null-assertion`。

**当前状态**:
- 🟢 `no-console` 问题已解决：引入统一的 `logger` 模块（`src/lib/logger.ts`），全局 `console.log` 调用已被消除，日志统一通过 `Logger` 类输出
- 🔴 `no-explicit-any` 未改善：60+ 文件仍有文件级 disable
- 🔴 `no-non-null-assertion` 未改善：未统一使用可选链 `?.` 和空值合并 `??`

**建议**:
- 对于 `no-explicit-any`：逐步修复类型，而非禁用规则
- 对于 `no-non-null-assertion`：使用可选链 `?.` 和空值合并 `??` 替代 `!`

---

### 3.2 🟡 中优先级（代码质量）

| # | 问题 | 位置 | 影响 | 状态 |
|---|------|------|------|------|
| 6 | **`db.client.ts` 2784 行巨型文件** | `src/lib/db.client.ts` | 应拆分为 domain-specific 文件 | 🔴 未修改 |
| 7 | `localStorage` QuotaExceeded 清空所有用户缓存 | `db.client.ts:218` | 一个用户的大缓存删除所有用户数据 | 🔴 未修改 |
| 8 | `JSON.stringify` 比较检测缓存变更 | `db.client.ts` 6+ 处 | 大数据集时 O(n) 阻塞主线程 | 🔴 未修改 |
| 9 | 配置默认值在 3 个文件中重复定义 | `refine.ts`, `self-check.ts`, `loader.ts` | 运行时顺序依赖导致覆盖冲突 | 🔴 未修改 |
| 10 | 服务层只有 4 个 service vs 51 个 API 路由 | `src/services/` | 业务逻辑散布在路由处理器中 | 🔴 未修改 |
| 11 | 无统一请求校验 | 所有 API 路由 | Zod 已安装但未在各路由统一使用 | 🔴 未修改 |
| 12 | 无 API 速率限制 | 除 cron 外的所有路由 | 登录、API 调用无暴力破解防护 | 🔴 未修改 |
| 13 | `node-fetch` v2 已 EOL | `tmdb.search.ts`, `tmdb.client.ts`, `magnet.client.ts` | Node 18+ 已有原生 `fetch` | 🔴 未修改 |

### 3.3 🟢 低优先级（优化与规范）

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| 14 | **缺少组件目录结构** — 70+ 组件平铺在 `src/components/` 下，仅 `watch-room/` 有子目录 | `src/components/` | 🔴 未修改 |
| 15 | `tsconfig.json` target 为 ES2017，过旧 | `tsconfig.json:3` | 🔴 未修改 |
| 16 | ESLint 配置使用 FlatCompat 兼容模式 | `eslint.config.mjs` | 🔴 未修改 |
| 17 | `next-router-mock` 在 App Router 项目中可能不需要 | `jest.setup.js` | 🔴 未修改 |
| 18 | `webpack-obfuscator` 对开源项目属于反模式 | `devDependencies` | 🔴 未修改 |
| 19 | `src/config/` 和 `src/lib/config/` 目录重叠 | 架构混淆 | 🔴 未修改 |

**组件目录重组建议**：
```
src/components/
  player/      # 播放器相关（ArtPlayer, DanmakuPanel, EpisodeSelector...）
  search/      # 搜索相关（SearchSuggestions, SearchResultFilter...）
  danmaku/     # 弹幕相关（DanmakuPanel, DanmakuFilterSettings...）
  douban/      # 豆瓣相关（DoubanSelector, DoubanRecommendations...）
  admin/       # 管理相关（DownloadManagementPanel, DeviceManagementPanel...）
  layout/      # 布局相关（Sidebar, MobileBottomNav, MobileHeader...）
  common/      # 通用 UI（Toast, ConfirmDialog, Drawer...）
```

---

## 4. 架构优化建议

1. **拆分 layout.tsx 配置逻辑**: 提取 getRuntimeConfig() 到独立模块，定义 FeatureFlags 类型
2. **拆分 AdminConfig 类型**: 将 15 个子配置拆分为独立文件，使用组合模式重新导出
3. **建立 IStorageV2 接口**: 将所有 V2 方法签名加入接口，消除 as any 调用
4. **抽取通用缓存抽象**: db.client.ts 中 40+ 处重复的缓存读取模式应抽取为 createCachedDataAccess[T] 工厂函数
5. **重组组件目录**: 按功能域组织 (player/search/danmaku/douban/admin/layout/common)，参见 3.3 节组件目录建议
6. **拆分巨型文件**: db.client.ts (2784 行)、cron route (916 行) 应按领域拆分
7. **建立统一服务层**: 将 API 路由中的业务逻辑提取到 services/ 目录
8. **添加 Zod 校验中间件**: 统一参数校验和错误格式
9. **添加 CSP 头**: 防止 XSS 和脚本注入
10. **添加速率限制**: 使用 @upstash/ratelimit 或类似方案保护所有公共 API
11. **添加测试**: 至少覆盖核心搜索/播放/认证流程
12. **配置管理重构**: 合并 refine.ts/self-check.ts/loader.ts 3 处配置默认值定义到单一源
13. **替换 node-fetch**: 3 个文件迁移到 Node 原生 fetch，移除 EOL 依赖

---

## 5. 验证清单

修复后建议验证以下场景：

- [ ] 视频源脚本执行不报错（`worker_threads` 路径正确）
- [ ] 登录后 cookie 为 HttpOnly，JS 无法通过 `document.cookie` 读取
- [ ] 观影室创建时密码正确哈希存储，验证通过
- [ ] 观影室 CORS 仅允许配置的 origin 连接
- [ ] Cron 端点仅 Bearer token 可访问，URL 路径密码不接受
- [ ] 运行时配置正确注入页面，`window.RUNTIME_CONFIG` 可用
- [ ] Admin API 错误返回正确格式 (`{success: false, error: "..."}`)
- [ ] LocalStorage 模式服务端代码抛出明确错误
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] `npm run build` 通过