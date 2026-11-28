# CodexHost Extensions Registry / CodexHost 扩展市场索引

[CodexHost](https://github.com/BytePioneer-AI/codex-host)（Codex Desktop & CH Web）官方公开扩展市场元数据仓库。

本仓库**仅维护审核通过的扩展来源清单与自动生成的市场目录**，不托管、不编译第三方源码。

- **快速导航**：[工作原理](#工作原理) · [投稿上架](#投稿上架) · [发布版本更新](#发布版本更新) · [扩展包与校验要求](#扩展包与校验要求) · [仓库结构与目录地址](#仓库结构与目录地址) · [维护者指南](#维护者指南) · [English Guide](#english-guide)

---

## 工作原理

```text
开发者提交 GitHub 仓库 URL（Issue Form）
  │
  ▼  GitHub Actions: Submission issue to PR
自动读取 manifest.json → 执行格式与静态安全校验 → 生成 sources/<id>.json PR + 安全报告
  │   ├─ 纯前端/主题且由仓库本人投稿（无高危模式）→ 自动合并并立即触发同步（约 1 分钟上架）
  │   └─ 含本地 Node 后端 / 非本人投稿 / 命中高危模式 → 维护者人工复核后合并 PR
  │
  ▼  GitHub Actions: Desktop extension registry（变更即时触发 + 5 分钟 Worker 检测 + 错峰兜底定时同步）
校验全部来源 → 生成 catalog.v2.json / catalog.json → 缓冲后刷新 jsDelivr CDN 缓存 + 监控 Worker 健康状态
  │
  ▼
CodexHost Desktop / CH Web 插件中心展示列表与更新提示
```

> **重要说明**：市场同步仅更新索引目录，**不会在用户设备上静默安装、升级或启用扩展**。SHA-256 用于校验下载完整性，静态扫描用于拦截高危模式，均不等同于完整代码审计或运行沙箱。

---

## 投稿上架

### 方式一：通过 Issue 表单全自动投稿（推荐）

1. 打开 [**提交扩展 Issue 表单**](https://github.com/BytePioneer-AI/codexhost-extensions-registry/issues/new?template=submit-extension.yml)。
2. 只需填写公开的 GitHub 仓库主页地址（例如 `https://github.com/<owner>/<repo>`）。
3. 提交后，`Submission issue to PR` 工作流会自动完成：
   - 从最新稳定 Release 的 `.zip`（无 Release 时回退到默认分支）读取 `manifest.json`；
   - 运行完整契约校验与静态安全扫描；
   - 自动创建 `sources/<id>.json` 的 PR 并把链接评论回 Issue。
4. 若校验未通过，Bot 会在 Issue 下直接列出具体错误；修改扩展仓库后**编辑该 Issue** 即可自动重新校验。
   - 若扩展因需要启动本机命令行（`child_process`）等正当能力而无法通过自动检查，可提交 [**人工审查上架 Issue**](https://github.com/BytePioneer-AI/codexhost-extensions-registry/issues/new?template=manual-review.yml)（说明仓库地址、插件介绍与原因），或扫码联系维护者微信（见 [CodexHost 微信联系方式](https://github.com/BytePioneer-AI/codex-host/blob/main/docs/project/README.zh-CN.md#%E5%BE%AE%E4%BF%A1%E4%BA%A4%E6%B5%81%E7%BE%A4)，备注「CodexHost 插件」），维护者人工审查后可单独放行上架。
5. **自动审核与上架**：
   - 若为**纯主题 / 纯前端扩展**（不声明 `backend`）、由**仓库本人投稿**（组织仓库须同时为公开成员且为版本发布者）且通过全部校验与前端风险扫描，工作流会自动合并该 PR 并立即触发目录同步，约 **1 分钟**内即可上架。
   - 若包含**独立 Node 后端（`backend`）**、非仓库本人投稿或命中可疑模式，PR 会保持开启并在评论中标明原因，等待维护者人工复核 `safety-report.md` 后合并。

### 方式二：直接提交 PR

在 `sources/` 目录新增一个以扩展 ID 命名的独立 JSON 文件 `sources/<id>.json`（每个扩展独占一个文件，并行投稿互不冲突）：

```json
{
  "id": "my-extension",
  "repository": "https://github.com/owner/my-extension",
  "trustTier": "community"
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 必须与文件名 `<id>.json` 及 `manifest.json` 中的 `id` 完全一致，不可重复。 |
| `repository` | 是 | 公开 GitHub 仓库主页 URL（`https://github.com/<owner>/<repo>`）。 |
| `asset` | 否 | 精确指定 Release 中的 `.zip` 文件名；仅在 Release 包含多个 `.zip` 资产时需要。 |
| `trustTier` | 否 | 默认 `community`；`official` 仅由维护者授予官方维护来源。 |
| `minCodexHostVersion` | 否 | 可选最低兼容的 CodexHost 版本号。 |
| `allowChildProcess` | 否 | 默认 `false`；仅由维护者人工审计后显式设为 `true`，为声明了 `backend` 的扩展放行非前端文件中的 `child_process` 静态检查（并在 `safety-report.md` 中列明豁免文件）。 |

---

## 发布版本更新

扩展上架后，**无需再向本仓库提 PR**，只需在扩展自己的仓库发布新版本即可：

| 发布方式 | 做法 | 适用场景 |
| --- | --- | --- |
| **正式 GitHub Release（推荐）** | 递增 `manifest.json` 的 `version` → 创建公开正式 Release（非 Draft / Pre-release）→ 上传**唯一 1 个**构建好的 `.zip` 资产（若声明了 `icon` / `screenshots`，同步上传同名图片资产） | 明确区分开发提交与正式版，推荐绝大多数扩展使用 |
| **默认分支源码（无 Release 时兜底）** | 递增 `manifest.json` 的 `version` → 直接推送到默认分支（需包含构建后的入口 JS 与资源文件） | 轻量纯前端脚本，未创建过 Release 时自动固定到已校验 commit |

**更新何时对用户可见？**

1. 线上的 Cloudflare Worker 每 **5 分钟**批量检测全部扩展的新版本并自动触发同步（另有错峰 GitHub Actions 定时任务兜底），同步完成后会等待上游生效再清理 jsDelivr 缓存；
2. 若希望发完 Release 后 **30 秒～1 分钟内**立刻同步，可在发布脚本中顺手调用一次即时触发口（内置 60 秒防刷冷却，只在检测到真实新版本时触发）：
   ```sh
   curl -fsS -X POST https://ext-stats.chost.dev/sync
   ```
3. CodexHost 客户端本地缓存市场目录 **5 分钟**，用户点击插件中心右上角「刷新」即可立即看到版本更新提示。

> **注意**：只要 ZIP 字节发生变化就**必须递增 `manifest.json` 中的 `version`**（版本号不变但内容变化会被校验器拒绝）；源码模式下即使只修改 README 也会改变 zipball 字节。

---

## 扩展包与校验要求

扩展开发规范请参考 CodexHost 主仓库文档与 [Host 扩展开发指南](https://github.com/BytePioneer-AI/codex-host/blob/main/docs/architecture/desktop-ui-extensions.md)。

### 1. 支持的扩展入口（`manifestVersion: 2`）

统一扩展至少声明以下入口之一，客户端按入口自动适配 Desktop 与 CH Web：

| 入口 | 用途 | 适用端 |
| --- | --- | --- |
| `page` | 跨端独立管理页（ESM `.mjs` + 可选 `.css`） | Codex Desktop & CH Web |
| `widget` | 主窗口常驻悬浮挂件（Shadow DOM） | Codex Desktop & CH Web |
| `desktop` | Codex Desktop 宿主 DOM 注入（经典 `.js`） | Codex Desktop |
| `web` | CH Web 宿主注入（ESM `.mjs` / 纯 `.css`） | CH Web |
| `backend` | 共享 Host 托管的单实例 Node 后端（`.mjs`） | Codex Desktop & CH Web |

> 同时兼容旧版 `manifestVersion: 1` Desktop 扩展（自动写入 `catalog.json` 与 `catalog.v2.json`）。

### 2. Manifest 必填与分类规范

- `name`、`description` 须提供非空 `en` 与 `zh-CN` 双语文案（`details` 若提供也须双语）；`author`、`version` 必填。
- `categories` 可省略或填 `[]`，允许值（不可重复）：
  - `appearance`（外观主题）
  - `interface`（界面增强）
  - `workflow`（效率与协作）
  - `analytics`（数据与统计）
  - `integrations`（外部集成）
  - `tools`（实用工具）

### 3. 资源与打包限制

| 项目 | 限制与要求 |
| --- | --- |
| ZIP 结构 | 根目录或唯一顶层目录下须含 `manifest.json` 及声明的入口与资源；仅支持 `STORE` / `DEFLATE`，禁止符号链接、越界路径与特殊文件 |
| `icon`（可选） | ≤ `128 KiB`，仅 PNG / JPEG / WebP，扩展名须匹配文件头签名 |
| `screenshots`（可选） | 最多 **4 张**，每张 ≤ `512 KiB`，仅 PNG / JPEG / WebP，扩展名须匹配文件头签名 |
| Release 图片资产 | Release 模式下需将 `icon` 与 `screenshots` 对应的原图作为同名独立资产上传（资产名为路径最后一段），校验器会逐字节核对与 ZIP 内一致；源码模式自动使用固定 commit 的 Raw URL |
| 安全静态检查 | CI 不执行扩展代码；记录并核对 ZIP 的 SHA-256，默认静态阻拦 `eval(`、`new Function`、`child_process` 等高危模式（仅当维护者在 `sources/<id>.json` 中显式配置 `"allowChildProcess": true` 时，才对含 `backend` 扩展的非前端文件放行 `child_process`） |

---

## 仓库结构与目录地址

```text
.
├── sources/                         # 审核通过的扩展来源（每个扩展一个 <id>.json）
├── catalog.v2.json                  # 自动生成：v2 统一扩展目录（Desktop + Web）
├── catalog.json                     # 自动生成：v1 兼容扩展目录
├── validate-and-build-catalog.mjs   # 来源校验、安全扫描与目录生成脚本
├── runtime.mjs                      # 由 codexhost 导出的契约校验与 ZIP 解析器
├── scripts/
│   ├── issue-to-pr.mjs              # Issue 表单自动校验、分级判定与转 PR 脚本
│   └── check-worker-health.mjs      # Worker 健康检查与自动开/关告警 Issue 脚本
├── worker/                          # Cloudflare Worker（下载量统计、5 分钟批量更新检测与 POST /sync）
└── .github/
    ├── ISSUE_TEMPLATE/submit-extension.yml
    └── workflows/
        ├── deploy-worker.yml        # Worker 单测与自动部署到 Cloudflare
        ├── issue-to-pr.yml          # 投稿 Issue 自动校验、分级自动合并或建 PR
        └── registry-sync.yml        # PR 检查、同步目录、清缓存与 Worker 健康告警
```

客户端公开读取地址（支持 GitHub Raw 与 jsDelivr 并发竞速）：

- **GitHub Raw**：`https://raw.githubusercontent.com/BytePioneer-AI/codexhost-extensions-registry/main/catalog.v2.json`
- **jsDelivr 镜像**：`https://cdn.jsdelivr.net/gh/BytePioneer-AI/codexhost-extensions-registry@main/catalog.v2.json`
- 本地调试测试索引时，可设置环境变量 `CODEXHOST_DESKTOP_EXTENSIONS_CATALOG_URL` 覆盖默认地址。

---

## 维护者指南

### 日常审核与同步

- **审核投稿 PR**：检查 Actions 产物或 PR 折叠区中的 `safety-report.md`，确认仓库归属、作者、扩展 ID、`trustTier` 与代码行为无异常后再合并（不要盲点 Merge）。
- **下架扩展**：删除对应的 `sources/<id>.json` 并合并至 `main`，同步工作流会自动从目录移除（用户已安装的本地副本需自行卸载）。
- **手动触发同步**：在仓库 **Actions → Desktop extension registry → Run workflow** 可立即同步最新 Release，无需等待 30 分钟定时任务。
- **本地验证**：
  ```sh
  # 需要 Node 24+
  npm ci --ignore-scripts
  node validate-and-build-catalog.mjs --check-only
  ```
  去掉 `--check-only` 会重新生成 `catalog.json` 与 `catalog.v2.json`（无变更时不修改时间戳）。校验失败时工作流会保留上一份有效目录，可从运行记录下载 `safety-report.md` 排查。
- **更新契约运行时**：当主仓库扩展契约变更时，在 `codex-host` 仓库执行 `node tools/export-desktop-extension-registry.mjs` 导出最新 `runtime.mjs` 同步至本仓库。

<details>
<summary>可选部署：Cloudflare Worker（下载量统计 &amp; 5 分钟自动更新检测）</summary>

#### 1. 统计扩展安装/更新次数（Cloudflare Free 额度）

1. 进入 `worker/` 目录，登录并创建 KV 命名空间：
   ```sh
   npx wrangler login
   npx wrangler kv namespace create STATS_KV
   ```
   将返回的 Namespace `id` 填入 `worker/wrangler.toml`。
2. 部署并验证健康检查：
   ```sh
   npx wrangler deploy
   ```
   访问 `https://<your-worker>.workers.dev/health` 确认返回 `{ "ok": true }`。
3. 在本仓库 **Settings → Secrets and variables → Actions → Variables** 新增变量 `STATS_URL`（填 Worker 根地址，不带 `/stats.json`）；在 CodexHost Host/Console 进程配置相同的 `CODEXHOST_DESKTOP_EXTENSIONS_STATS_URL`。
4. 仅统计从市场成功完成的安装/更新，客户端只上报扩展 ID（不含账号或设备信息），属于参考计数而非精确去重统计。

#### 2. 启用 5 分钟自动同步检测、自动部署与故障告警

同一 Worker 内置 `crons = ["*/5 * * * *"]` 与即时触发口 `POST /sync`（带 60 秒冷却与并发合并），通过 GitHub GraphQL 批量比对 `sources/` 中各扩展的最新 Release ZIP（或默认分支 commit）与当前 `catalog.v2.json` 的 `downloadUrl`，一旦发现新版本或来源下架即自动触发 `registry-sync.yml`；`/stats.json` 内置 5 分钟 Edge Cache 避免触碰 KV 列表日配额；`/health` 返回脱敏后的最近一次巡检摘要。

**推荐通过 GitHub Actions 自动部署（`.github/workflows/deploy-worker.yml`）**：

在仓库 **Settings → Secrets and variables → Actions** 配置一次以下密钥/变量后，每次修改 `worker/**` 合并到 `main`（或手动触发 `Deploy stats & sync worker`）都会自动运行单测并部署到 Cloudflare：

- `secrets.CLOUDFLARE_API_TOKEN`：拥有 Workers Scripts Edit 权限的 Cloudflare API Token；
- `secrets.CLOUDFLARE_ACCOUNT_ID`：Cloudflare Account ID；
- `secrets.CLOUDFLARE_STATS_DB_ID`（或同名 Variable）：Cloudflare D1 `codexhost-stats` 数据库 ID（用于部署时替换 `worker/wrangler.toml` 中的 `YOUR_D1_DATABASE_ID`，仅承载扩展下载量与零 ID 本地去重聚合计数，不设设备表、不存设备 ID 或 IP）；
- `secrets.CLOUDFLARE_STATS_KV_ID`（或同名 Variable）：`STATS_KV` 命名空间 ID（用于部署时替换 `worker/wrangler.toml` 中的 `YOUR_KV_NAMESPACE_ID`）；
- `secrets.WORKER_GITHUB_TOKEN`（可选）：仅拥有本仓库 **Actions: Read and write** 与 **Contents: Read** 的 Fine-grained PAT，配置后会在部署时自动同步为 Worker 的 `GITHUB_TOKEN` Secret；
- `secrets.DASHBOARD_TOKEN`（可选，或通过 `npx wrangler secret put DASHBOARD_TOKEN` 本地配置）：保护 `/dashboard` 与 `/v1/dashboard/*` 的管理员访问令牌；
- `vars.STATS_URL`：Worker 根地址（如 `https://ext-stats.chost.dev`），配置后自动开启部署后 `/health` 冒烟检查与 `registry-sync.yml` 中的定时健康监控（当 `/health` 异常、巡检超过 45 分钟未刷新或 `/stats.json` 报错时自动创建去重告警 Issue，恢复后自动关闭）。

如需手工本地配置 Secret 与部署，也可在 `worker/` 目录执行：

```sh
npx wrangler secret put GITHUB_TOKEN
npx wrangler deploy --keep-vars
```

未配置 `GITHUB_TOKEN` 时自动跳过检测，不影响下载统计接口。

</details>

---

## English Guide

**CodexHost Extensions Registry** is the public metadata catalog for **Codex Desktop** and **CH Web** extensions (`manifestVersion: 2` unified extensions and legacy `v1` Desktop extensions). It stores verified source descriptors under `sources/<id>.json` and publishes machine-readable `catalog.v2.json` / `catalog.json` indexes via GitHub Actions.

### Submit an Extension

1. Open the [**Submit Extension Issue Form**](https://github.com/BytePioneer-AI/codexhost-extensions-registry/issues/new?template=submit-extension.yml) and enter your public GitHub repository URL (`https://github.com/<owner>/<repo>`).
2. GitHub Actions automatically reads `manifest.json` from your latest stable Release `.zip` (or default branch if no Release exists), runs schema & static safety checks, and opens a PR adding `sources/<id>.json`.
   - If your extension cannot pass automatic checks for a legitimate reason (such as a `backend` spawning local CLI tools via `child_process`), open a [**Manual Review Issue**](https://github.com/BytePioneer-AI/codexhost-extensions-registry/issues/new?template=manual-review.yml) with your repository URL and description (or contact the maintainer on WeChat via the [CodexHost README](https://github.com/BytePioneer-AI/codex-host#%E5%BE%AE%E4%BF%A1%E4%BA%A4%E6%B5%81%E7%BE%A4)) for manual review and listing.
3. Frontend-only extensions (no `backend`) submitted by the repository owner that pass all schema, static, and frontend risk checks are auto-merged and synced within ~1 minute. Extensions declaring a local Node `backend`, third-party submissions, or flagged scripts stay open for manual maintainer review.

### Publish an Update

- **Recommended (Release ZIP)**: Bump `version` in `manifest.json`, publish a public non-prerelease GitHub Release, and attach a single `.zip` archive (plus matching `icon` / `screenshots` image assets if declared).
- **Fallback (Default Branch)**: If your repo has no Release, bump `version` and push built files to the default branch.
- The Cloudflare Worker checks for updates every **5 minutes** via GraphQL batching (with a staggered GitHub Actions schedule as fallback) and purges jsDelivr after GitHub propagates the commit. Authors who want near-instant sync (~1 min) can optionally call `curl -fsS -X POST https://ext-stats.chost.dev/sync` (60s cooldown). Clients refresh on demand or after their 5-minute local cache expires.
- **Note**: Registry updates never auto-install or auto-update extensions on user devices.
