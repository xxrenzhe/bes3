# Bes3 生产环境部署文档

本文档用于 `bes3.com` 的正式生产部署，覆盖：

- 生产架构
- 服务器目录结构
- 全量环境变量说明
- Cloudflare / ClawCloud 部署步骤
- 首次上线、日常发布、回滚、健康检查
- PostgreSQL / 对象存储 / 备份恢复要求

本文档以当前仓库实现为准，基于以下已验证文件整理：

- `docs/BasicPrinciples/MustKnowV1.md`
- `docs/BasicPrinciples/MONOREPO_BUILD_BEST_PRACTICES.md`
- `docs/plan/03-部署、持久化与运维.md`
- `docs/planv2/12.Bes3 生产告警与上线SOP (Production Alerting & Launch SOP).md`
- `Dockerfile`
- `docker-compose.yml`
- `supervisord.conf`
- `.env.production.example`
- `scripts/check-runtime-env.js`
- `scripts/deploy-ghcr.sh`
- `scripts/preflight-release.sh`

## 1. 生产架构

Bes3 当前生产架构如下：

1. 代码推送到 `main`
2. GitHub Actions 构建镜像并推送到 GHCR
3. ClawCloud 服务器手动拉取 `ghcr.io/xxrenzhe/bes3:prod-latest`
4. 容器内通过 `supervisord` 管理三个进程：
   - `bes3-migrate`
   - `bes3-web`
   - `bes3-worker`
5. 对外只暴露容器 `80` 端口
6. Cloudflare 负责：
   - DNS
   - HTTPS 终止
   - WAF / Bot 防护
7. PostgreSQL 使用第三方云数据库
8. 媒体文件使用第三方对象存储

## 2. 域名与外部入口

正式生产域名：

- `https://bes3.com`
- `https://www.bes3.com`

必须满足：

1. Cloudflare DNS 指向 ClawCloud 公网入口
2. Cloudflare 开启 Full / Full (strict) HTTPS
3. Cloudflare 开启自动 HTTP -> HTTPS 跳转
4. 外部只允许访问公开站点与公开 API

公开路径：

- `/`
- `/categories/*`
- `/products/*`
- `/reviews/*`
- `/compare/*`
- `/deals/*`
- `/api/open/*`
- `/api/health`
- `/robots.txt`
- `/sitemap.xml`
- `/.well-known/security.txt`

不得对外暴露：

- `/admin/*`
- `/api/admin/*`
- `/api/internal/*`
- `/api/auth/*`

## 3. 服务器目录结构

建议生产目录：

```text
/srv/bes3
├── .env.production
├── docker-compose.yml
├── data/
├── storage/
│   └── media/
└── backups/
```

说明：

- `data/`：仅在 SQLite 或某些临时运行态文件场景下使用
- `storage/media/`：仅在 `MEDIA_DRIVER=local` 时真实承载媒体
- 正式生产建议切到 S3/对象存储；可先用最小环境变量启动，再到 `/settings` 配置媒体存储

## 4. 全量环境变量

说明：

- 下表“生产建议值”统一写成 `默认值 / 生产建议` 形式
- `默认值` 来自当前源码、`.env.production.example` 与 `scripts/check-runtime-env.js`
- 标记为“无默认值”的启动变量，表示生产环境必须显式配置
- 若某变量已有安全默认值，可不写入 `.env.production`
- `/settings` 页面写入 `system_settings`，读取优先级是 `system_settings` > 环境变量 > 代码默认值
- 环境变量应保留启动级与根密钥配置：数据库、登录密钥、加密密钥、首次管理员密码、公开站点地址
- 媒体/S3、AI、联盟同步、代理、SEO、分发、通知等运行配置优先在 `/settings` 维护，环境变量只作为首次启动前的预置或回退
- `ENCRYPTION_KEY` 不能放入 `/settings`，因为它用于解密 `system_settings.encrypted_value`

### 4.1 核心运行变量

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `NODE_ENV` | 是 | 默认 `production`；生产建议显式写入 `production` | 固定为生产模式 |
| `PORT` | 是 | 默认 `80`；生产建议显式写入 `80` | 容器内对外监听端口 |
| `HOSTNAME` | 是 | 默认 `0.0.0.0`；生产建议显式写入 `0.0.0.0` | 容器内监听地址 |
| `NEXT_PUBLIC_APP_URL` | 是 | 无默认值；必须显式写 `https://bes3.com` | 公开站点主域名 |
| `BES3_ALLOWED_HOSTS` | 否 | 默认已包含 `bes3.com,www.bes3.com,localhost,localhost:3000,127.0.0.1,127.0.0.1:3000` | Next Server Actions 允许域名，通常可省略 |

### 4.2 认证与管理员

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `JWT_SECRET` | 是 | 无默认值；必须显式写长度 >= 32 的随机字符串 | 登录态签名密钥 |
| `ENCRYPTION_KEY` | 是 | 无默认值；必须显式写 32 字节随机值的 64 位 hex 字符串 | 加密 `system_settings` 中的敏感配置；不能存入 `/settings` |
| `DEFAULT_ADMIN_USERNAME` | 否 | 默认 `autobes3`；如无品牌化需求可省略 | 默认管理员用户名 |
| `DEFAULT_ADMIN_EMAIL` | 否 | 默认 `admin@bes3.local`；生产建议改成 `admin@bes3.com` | 默认管理员邮箱 |
| `DEFAULT_ADMIN_PASSWORD` | 是 | 无默认值；必须显式写长度 >= 16 的强密码 | 首次启动管理员密码，首次登录后必须轮换 |
| `BES3_ALLOW_INSECURE_DEFAULTS` | 否 | 默认 `false`；生产保持省略或显式写 `false` | 仅本地调试可设 `true`，生产禁止开启 |

### 4.3 数据库

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 是 | 无默认值；生产必须显式写 PostgreSQL 连接串 | 第三方云 PostgreSQL 连接串 |
| `DATABASE_PATH` | 否 | 默认 `./data/bes3.db` | SQLite 路径；生产 PostgreSQL 场景下可省略 |

说明：

- 正式生产优先使用 `DATABASE_URL`
- 多实例或正式对外服务不建议继续依赖 SQLite

### 4.4 媒体与对象存储

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `MEDIA_DRIVER` | 否 | 默认 `local`；生产建议通过 `/settings` 改成 `s3` | 生产建议对象存储；环境变量可作为启动前预置 |
| `MEDIA_LOCAL_ROOT` | 否 | 默认 `storage/media` | 本地媒体根目录；`MEDIA_DRIVER=s3` 时通常可省略 |
| `MEDIA_PUBLIC_BASE_URL` | 条件 | 无默认值；S3 公开访问域名可在 `/settings` 配置 | 前台媒体访问地址；为空时可由 endpoint + bucket 推导 |
| `S3_ENDPOINT` | 条件 | 无默认值；S3 模式下必填，可在 `/settings` 配置 | S3 / R2 / MinIO 兼容端点，支持裸域名或完整 URL |
| `S3_REGION` | 否 | 默认 `auto` | 对象存储 region |
| `S3_BUCKET` | 条件 | 无默认值；S3 模式下必填，可在 `/settings` 配置 | Bucket 名称 |
| `S3_ACCESS_KEY_ID` | 条件 | 无默认值；S3 模式下必填，可在 `/settings` 配置 | 对象存储访问 key，后台按敏感值加密保存 |
| `S3_SECRET_ACCESS_KEY` | 条件 | 无默认值；S3 模式下必填，可在 `/settings` 配置 | 对象存储 secret，后台按敏感值加密保存 |
| `S3_FORCE_PATH_STYLE` | 否 | 默认 `false` | MinIO 等兼容场景可设 `true` |

说明：

- 最小生产 env 可以先保留 `MEDIA_DRIVER=local`，确保站点首次启动和管理员登录
- 在任何会持久化媒体的任务运行前，应到 `/settings` 将 `media.driver`、`media.s3Endpoint`、`media.s3Bucket`、`media.s3AccessKeyId`、`media.s3SecretAccessKey` 配完整
- 当前对象存储端点示例：`objectstorageapi.sg-members-1.clawcloudrun.com`；Access Key 和 Secret Key 不应写入仓库文档

### 4.5 联盟同步

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `PARTNERBOOST_AMAZON_BASE_URL` | 否 | 默认 `https://app.partnerboost.com` | Amazon 联盟 API 基地址 |
| `PARTNERBOOST_AMAZON_TOKEN` | 功能启用时 | 无默认值；启用 Amazon 联盟同步时必填，优先在 `/settings` 配置 | Amazon 联盟同步，后台按敏感值加密保存 |
| `PARTNERBOOST_DTC_BASE_URL` | 否 | 默认 `https://app.partnerboost.com` | DTC 联盟 API 基地址 |
| `PARTNERBOOST_DTC_TOKEN` | 功能启用时 | 无默认值；启用 DTC 联盟同步时必填，优先在 `/settings` 配置 | DTC 联盟同步，后台按敏感值加密保存 |
| `PARTNERBOOST_AMAZON_PAGE_SIZE` | 否 | 默认 `20` | 每页同步数量 |
| `PARTNERBOOST_DTC_PAGE_SIZE` | 否 | 默认 `20` | 每页同步数量 |
| `PARTNERBOOST_MAX_PAGES_PER_SYNC` | 否 | 默认 `5` | 单次同步最大页数 |

### 4.6 AI 引擎

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `AI_PROVIDER` | 否 | 默认 `gemini` | AI 提供方 |
| `GEMINI_PROVIDER` | 否 | 默认空；仅兼容旧变量 | 兼容旧变量 |
| `GEMINI_API_KEY` | 功能启用时 | 无默认值；启用真实 AI 分析时建议在 `/settings` 配置 | 内容生成、分析、提炼，后台按敏感值加密保存 |
| `GEMINI_MODEL` | 否 | 默认 `gemini-3-flash-preview`；优先在 `/settings` 配置 | 当前推荐模型 |
| `GEMINI_BASE_URL` | 否 | 默认 `https://generativelanguage.googleapis.com`；使用中转时优先在 `/settings` 改写 | Gemini API base URL |

### 4.7 抓取与代理

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `PLAYWRIGHT_HEADLESS` | 否 | 默认 `true` | 无头浏览器模式 |
| `BROWSER_PROXY_URLS_JSON` | 功能启用时 | 默认 `[]`；正式生产建议在 `/settings` 配置代理池 | 浏览器代理池 |
| `PROXY_DEFAULT_COUNTRY` | 否 | 默认 `US`；优先在 `/settings` 配置 | 默认市场国家 |
| `DEEP_PRODUCT_SCRAPE_ENABLED` | 否 | 默认 `true`；优先在 `/settings` 配置 | 启用深抓取 |
| `DEEP_PRODUCT_SCRAPE_TIMEOUT_MS` | 否 | 默认 `60000`；优先在 `/settings` 配置 | 深抓取超时 |
| `DEEP_PRODUCT_SCRAPE_WAIT_AFTER_LOAD_MS` | 否 | 默认 `1500`；优先在 `/settings` 配置 | 页面稳定后额外等待 |
| `DEEP_PRODUCT_SCRAPE_MAX_ATTEMPTS` | 否 | 默认 `2`；优先在 `/settings` 配置 | 最大重试次数 |
| `DEEP_PRODUCT_SCRAPE_REQUIRE_PROXY` | 否 | 默认 `false`；正式生产建议在 `/settings` 改成 `true` | 正式生产建议开启 |

### 4.8 SEO / 索引 / 分发

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `PINGOMATIC_ENABLED` | 否 | 默认 `false`；优先在 `/settings` 配置 | 是否启用 Ping-O-Matic |
| `GOOGLE_INDEXING_ENABLED` | 否 | 默认 `false`；优先在 `/settings` 配置 | 是否启用 Google Indexing API |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | 条件必填 | 无默认值；当 `GOOGLE_INDEXING_ENABLED=true` 时必填，优先在 `/settings` 配置 | Google Indexing API 凭证，后台按敏感值加密保存 |
| `SEO_RENDER_AUDIT_BASE_URL` | 否 | 默认空；仅内网回源审计场景配置 | SEO 渲染审计备用 origin |
| `SEO_SYNDICATION_ENABLED` | 否 | 默认 `false`；优先在 `/settings` 配置 | 是否启用外部分发 |
| `SEO_SYNDICATION_TARGETS_JSON` | 否 | 默认 `[]`；优先在 `/settings` 配置 | 分发目标配置 |
| `LINK_INSPECTOR_ENABLED` | 否 | 默认 `true`；优先在 `/settings` 配置 | 启用链路检查 |
| `LINK_INSPECTOR_MAX_URLS` | 否 | 默认 `60`；优先在 `/settings` 配置 | 单次链路检查 URL 上限 |

### 4.9 价格提醒与通知

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `PRICE_ALERT_WEBHOOK_URL` | 功能启用时 | 默认空；只有接入 webhook 时才需要配置，优先在 `/settings` 配置 | 价格提醒通知出口；不填则只入队不发出 |

### 4.10 后台 Worker

| 变量名 | 必填 | 生产建议值 | 说明 |
| --- | --- | --- | --- |
| `PIPELINE_WORKER_ENABLED` | 否 | 默认 `true` | 启用后台 worker |
| `PIPELINE_WORKER_ID` | 否 | 默认空；留空即可自动标识 | worker 标识 |
| `PIPELINE_WORKER_POLL_MS` | 否 | 默认 `2500` | 轮询间隔 |
| `PIPELINE_WORKER_CONCURRENCY` | 否 | 默认 `1`；当前建议不超过 `4` | 单容器并发 |

### 4.11 最小需要配置的环境变量

按当前生产基线 `PostgreSQL + Cloudflare + 单容器`，环境变量只保留启动必需项：

1. `NEXT_PUBLIC_APP_URL=https://bes3.com`
2. `JWT_SECRET=<长度至少 32 位的随机字符串>`
3. `ENCRYPTION_KEY=<32 字节随机值的 64 位 hex 字符串>`
4. `DEFAULT_ADMIN_PASSWORD=<长度至少 16 位的强密码>`
5. `DATABASE_URL=postgres://user:password@host:5432/bes3`

说明：

- 如果不改管理员用户名，可省略 `DEFAULT_ADMIN_USERNAME`，默认是 `autobes3`
- 如果不改管理员邮箱，可省略 `DEFAULT_ADMIN_EMAIL`，默认是 `admin@bes3.local`；生产更建议显式改成 `admin@bes3.com`
- `NODE_ENV`、`PORT`、`HOSTNAME`、`BES3_ALLOWED_HOSTS`、`MEDIA_DRIVER`、`MEDIA_LOCAL_ROOT`、`PIPELINE_WORKER_*` 都已有默认值，但生产仍建议在 `.env.production` 中显式写入核心几项，便于运维排查
- `S3_*`、`PARTNERBOOST_*`、`GEMINI_*`、`BROWSER_PROXY_URLS_JSON`、`GOOGLE_*`、`PRICE_ALERT_WEBHOOK_URL` 都是“按功能启用再配置”，不是站点启动的最小前置条件
- 如果生产要使用对象存储，应在媒体持久化任务运行前到 `/settings` 配好 S3；也可以在 `.env.production` 预置同名变量作为首次启动回退
- 可直接复制本地示例：`docs/.env.production.minimal.example`

### 4.12 部署脚本相关变量

这些变量不是应用运行变量，而是部署脚本使用：

| 变量名 | 用途 |
| --- | --- |
| `GHCR_USERNAME` | 登录 GHCR |
| `GHCR_TOKEN` | 登录 GHCR |
| `BES3_APP_DIR` | 服务器应用目录，默认当前仓库 |
| `BES3_IMAGE` | 要部署的镜像标签 |
| `BES3_HEALTHCHECK_URL` | 部署后健康检查 URL |
| `BES3_SKIP_PULL` | 是否跳过 `docker compose pull` |
| `BES3_HOST_PORT` | 主机映射端口，默认 `80` |

## 5. 生产 `.env.production` 生成方式

服务器上执行：

```bash
cp .env.production.example .env.production
```

然后逐项替换占位值。若只追求“先把正式站点稳定跑起来”，最少先填：

1. `NEXT_PUBLIC_APP_URL`
2. `JWT_SECRET`
3. `ENCRYPTION_KEY`
4. `DEFAULT_ADMIN_PASSWORD`
5. `DATABASE_URL`

以下配置可在对应功能启用前通过 `/settings` 再补；如果需要容器首次启动即生效，也可以保留在 `.env.production`：

- `MEDIA_DRIVER`
- `MEDIA_PUBLIC_BASE_URL`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `PARTNERBOOST_AMAZON_TOKEN`
- `PARTNERBOOST_DTC_TOKEN`
- `GEMINI_API_KEY`
- `BROWSER_PROXY_URLS_JSON`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `PRICE_ALERT_WEBHOOK_URL`

禁止把填充后的 `.env.production` 提交到 Git。

## 6. 首次上线步骤

### 6.1 服务器准备

```bash
mkdir -p /srv/bes3/data
mkdir -p /srv/bes3/storage/media
mkdir -p /srv/bes3/backups
```

### 6.2 放置配置文件

将以下文件放到服务器目录：

- `docker-compose.yml`
- `.env.production`

### 6.3 发布前预检

```bash
cd /srv/bes3
npm run ops:preflight-release .env.production
```

如果服务器没有源码工作区，则至少在镜像发布前的本地或 CI 环节执行一次：

```bash
npm run ops:preflight-release .env.production
```

### 6.4 正式发布

```bash
GHCR_USERNAME=<github-username> \
GHCR_TOKEN=<ghcr-token> \
BES3_APP_DIR=/srv/bes3 \
BES3_IMAGE=ghcr.io/xxrenzhe/bes3:prod-latest \
./scripts/deploy-ghcr.sh
```

该脚本会：

1. 登录 GHCR
2. 拉取镜像
3. 执行 `check-runtime-env.js`
4. 执行数据库迁移
5. `docker compose up -d --no-build`
6. 检查 `/api/health`

## 7. 发布后验收

上线后至少检查：

1. `curl https://bes3.com/api/health`
2. 使用内部 token 请求 `/api/internal/health`
3. 访问首页、分类页、商品页、评测页、对比页
4. 访问 `/login`，确认无公开注册入口
5. 登录后台检查：
   - `Risk Center`
   - `Pipeline Runs`
   - `SEO Ops`
   - `Price & Value`
   - `Settings`
6. 执行一次真实商品同步与完整流水线验证

内部健康检查示例：

```bash
curl -H "x-bes3-internal-token: <JWT_SECRET>" \
  https://bes3.com/api/internal/health
```

重点字段应满足：

- `status=ok`
- `database.connected=true`
- `worker.enabled=true`
- `worker.heartbeatFresh=true`
- `migrations.pending=[]`

## 8. 日常发布流程

日常发布建议固定流程：

1. 确认 `main` 已生成 GHCR 镜像
2. 本地或 CI 执行 `npm run ops:preflight-release .env.production`
3. 服务器执行 `./scripts/deploy-ghcr.sh`
4. 验证 `/api/health`
5. 验证 `/api/internal/health`
6. 抽查公开页面与后台队列

## 9. 回滚流程

如果新镜像发布异常：

1. 选择上一个可用镜像标签，如 `ghcr.io/xxrenzhe/bes3:prod-<commitid>`
2. 重新执行：

```bash
GHCR_USERNAME=<github-username> \
GHCR_TOKEN=<ghcr-token> \
BES3_APP_DIR=/srv/bes3 \
BES3_IMAGE=ghcr.io/xxrenzhe/bes3:prod-<previous-commitid> \
./scripts/deploy-ghcr.sh
```

3. 再次检查 `/api/health` 与 `/api/internal/health`

## 10. Cloudflare 配置要求

1. DNS：
   - `bes3.com`
   - `www.bes3.com`
2. SSL/TLS：
   - Full 或 Full (strict)
3. Security：
   - 启用基础 WAF
   - 启用 Bot 防护
4. Rules：
   - 强制 HTTPS
   - 不要为 HTML 响应覆盖应用自己的缓存策略
5. 监控：
   - 结合 Cloudflare Analytics 观察 4xx/5xx 波动

## 11. 备份与恢复

### 11.1 主备份责任

正式生产的主备份策略：

1. PostgreSQL：使用云数据库自带备份/快照
2. 对象存储：使用对象版本控制、生命周期、跨区域备份

### 11.2 仓库内补充脚本

```bash
npm run ops:backup-runtime
```

该脚本默认打包：

- `data/`
- `storage/media/`

恢复：

```bash
BES3_RESTORE_CONFIRM=restore \
npm run ops:restore-runtime -- ./backups/<archive>.tar.gz
```

注意：

- 这不是云数据库和对象存储主备份的替代
- 它更适合卷文件恢复或演练

## 12. 上线前最终检查清单

1. `NEXT_PUBLIC_APP_URL=https://bes3.com`
2. `BES3_ALLOWED_HOSTS` 已包含正式域名
3. `JWT_SECRET` 已替换为强随机值
4. `ENCRYPTION_KEY` 已替换为 64 位 hex 随机值
5. `DEFAULT_ADMIN_PASSWORD` 已替换为强密码
6. `DATABASE_URL` 指向生产 PostgreSQL
7. `/settings` 中媒体配置已切到 S3，且 `MEDIA_PUBLIC_BASE_URL` / `S3_*` 有效
8. `/settings` 中 `PARTNERBOOST_*_TOKEN` 已按需配置
9. `/settings` 中 `GEMINI_API_KEY` 已按需配置
10. `GOOGLE_INDEXING_ENABLED=true` 时 `/settings` 中 `GOOGLE_SERVICE_ACCOUNT_JSON` 有效
11. `PIPELINE_WORKER_ENABLED=true`
12. `npm run ops:preflight-release .env.production` 通过
13. `/api/health` 与 `/api/internal/health` 正常
14. 至少完成一次真实商品全流程验证

## 13. 相关命令速查

```bash
# 运行环境校验
npm run ops:check-env .env.production

# 依赖审计治理
npm run ops:check-dependency-audit

# 生产预检
npm run ops:preflight-release .env.production

# 部署
./scripts/deploy-ghcr.sh

# 健康检查
npm run ops:health-check

# 备份
npm run ops:backup-runtime

# 恢复
BES3_RESTORE_CONFIRM=restore npm run ops:restore-runtime -- ./backups/<archive>.tar.gz
```
