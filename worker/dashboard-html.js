// Self-contained HTML/CSS/JS analytics dashboard for CodexHost (served at GET /dashboard).

export function renderDashboardHtml({ authenticated, configured }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>CodexHost Analytics Dashboard</title>
  <style>
    :root {
      --bg: #f6f8fa;
      --surface: #ffffff;
      --surface-muted: #f0f3f6;
      --border: #d8dee4;
      --text: #1f2328;
      --muted: #59636e;
      --accent: #0969da;
      --accent-soft: rgba(9, 105, 218, 0.12);
      --green: #1a7f37;
      --green-soft: rgba(26, 127, 55, 0.14);
      --purple: #8250df;
      --purple-soft: rgba(130, 80, 223, 0.14);
      --amber: #bf8700;
      --amber-soft: rgba(191, 135, 0, 0.14);
      --danger: #cf222e;
      --radius: 12px;
      --shadow: 0 1px 2px rgba(31, 35, 40, 0.04);
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #0d1117;
        --surface: #161b22;
        --surface-muted: #21262d;
        --border: #30363d;
        --text: #e6edf3;
        --muted: #8b949e;
        --accent: #58a6ff;
        --accent-soft: rgba(88, 166, 255, 0.16);
        --green: #3fb950;
        --green-soft: rgba(63, 185, 80, 0.16);
        --purple: #a371f7;
        --purple-soft: rgba(163, 113, 247, 0.16);
        --amber: #d29922;
        --amber-soft: rgba(210, 153, 34, 0.16);
        --danger: #f85149;
        --shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      }
    }
    :root[data-theme="dark"] {
      --bg: #0d1117;
      --surface: #161b22;
      --surface-muted: #21262d;
      --border: #30363d;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #58a6ff;
      --accent-soft: rgba(88, 166, 255, 0.16);
      --green: #3fb950;
      --green-soft: rgba(63, 185, 80, 0.16);
      --purple: #a371f7;
      --purple-soft: rgba(163, 113, 247, 0.16);
      --amber: #d29922;
      --amber-soft: rgba(210, 153, 34, 0.16);
      --danger: #f85149;
      --shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .container { max-width: 1240px; margin: 0 auto; padding: 20px 20px 48px; }
    header {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 12px; margin-bottom: 20px;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand h1 { font-size: 20px; margin: 0; font-weight: 700; letter-spacing: -0.02em; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600;
      background: var(--accent-soft); color: var(--accent);
    }
    .pill.ok { background: var(--green-soft); color: var(--green); }
    .pill.warn { background: var(--amber-soft); color: var(--amber); }
    .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .seg {
      display: inline-flex; background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; padding: 2px;
    }
    .seg button, .btn {
      border: 0; background: transparent; color: var(--muted); cursor: pointer;
      padding: 6px 11px; border-radius: 6px; font-size: 13px; font-weight: 500;
    }
    .seg button.active { background: var(--accent); color: #fff; }
    .btn {
      background: var(--surface); border: 1px solid var(--border); color: var(--text);
    }
    .btn:hover { background: var(--surface-muted); }
    .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .grid-kpi {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px; margin-bottom: 16px;
    }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow);
    }
    .kpi-label { font-size: 12px; color: var(--muted); font-weight: 500; }
    .kpi-value { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
    .kpi-sub { font-size: 12px; color: var(--muted); }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .card-title {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin: 0 0 12px; font-size: 15px; font-weight: 600;
    }
    .card-sub { font-size: 12px; color: var(--muted); font-weight: 400; }
    .chart-wrap { width: 100%; overflow: hidden; }
    .chart-wrap svg { width: 100%; height: auto; display: block; }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--muted); margin-top: 8px; }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
    .bar-list { display: flex; flex-direction: column; gap: 10px; }
    .bar-row { display: flex; flex-direction: column; gap: 4px; }
    .bar-head { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
    .bar-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-num { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .bar-track { height: 7px; border-radius: 999px; background: var(--surface-muted); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; background: var(--accent); }
    .bar-fill.green { background: var(--green); }
    .bar-fill.purple { background: var(--purple); }
    .bar-fill.amber { background: var(--amber); }
    .split-box {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;
    }
    .split-item {
      padding: 12px; border-radius: 10px; background: var(--surface-muted);
    }
    .split-item strong { display: block; font-size: 20px; font-variant-numeric: tabular-nums; margin-top: 2px; }
    .split-bar {
      display: flex; height: 10px; border-radius: 999px; overflow: hidden;
      background: var(--surface-muted); margin: 10px 0 14px;
    }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-weight: 600; font-size: 12px; white-space: nowrap; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .empty { color: var(--muted); font-size: 13px; padding: 14px 0; text-align: center; }
    .auth-shell {
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .auth-card { width: 100%; max-width: 400px; }
    .auth-card input {
      width: 100%; padding: 10px 12px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--bg); color: var(--text);
      font-size: 14px; margin: 10px 0 12px;
    }
    .err { color: var(--danger); font-size: 13px; margin-top: 8px; }
    footer { margin-top: 24px; font-size: 12px; color: var(--muted); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const BOOT = ${JSON.stringify({ authenticated, configured })};
    const CHANNEL_LABELS = {
      "official-relay": "官方加密中转 (relay.chost.dev)",
      "self-hosted-relay": "自建加密中转",
      "tailscale-serve": "Tailscale HTTPS (Serve)",
      "tailscale-funnel": "Tailscale Funnel",
      "tailscale-ip": "Tailscale IP",
      "lan": "同一 Wi-Fi / 局域网",
      "custom-proxy": "自备隧道 / 反代 (CF/nginx/frp)",
      "remote-peer": "SSH / 远程节点 (Peer)",
    };
    const SURFACE_LABELS = {
      "codex-desktop": "Codex Desktop",
      "web": "CH Web (浏览器)",
      "web-desktop-shell": "CH 独立桌面壳",
      "web-mobile": "手机 / PWA",
      "ssh-remote": "SSH 远端 Host",
      "cli": "CLI / 外部客户端",
    };
    const LANGUAGE_LABELS = {
      "zh": "中文 (zh)",
      "en": "English (en)",
      "ja": "日本語 (ja)",
      "ko": "한국어 (ko)",
      "de": "Deutsch (de)",
      "fr": "Français (fr)",
      "es": "Español (es)",
      "pt": "Português (pt)",
      "ru": "Русский (ru)",
      "other": "其他语言",
    };

    let state = {
      authenticated: BOOT.authenticated,
      configured: BOOT.configured,
      days: 30,
      data: null,
      loading: false,
      error: "",
      metricMode: "range",
    };

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
    const fmt = (n) => Number(n || 0).toLocaleString("en-US");
    const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "—";

    function renderLineChart(series, lines) {
      if (!series || series.length === 0) return '<div class="empty">暂无趋势数据</div>';
      const W = 560, H = 190, padL = 36, padR = 12, padT = 14, padB = 26;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      let maxVal = 1;
      for (const p of series) {
        for (const l of lines) maxVal = Math.max(maxVal, Number(p[l.key] || 0));
      }
      const x = (i) => padL + (series.length === 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
      const y = (v) => padT + plotH - (v / maxVal) * plotH;

      const gridLines = [0, 0.5, 1].map((t) => {
        const yy = padT + plotH - t * plotH;
        const val = Math.round(maxVal * t);
        return \`<line x1="\${padL}" y1="\${yy}" x2="\${W - padR}" y2="\${yy}" stroke="var(--border)" stroke-dasharray="3,3" />
                <text x="\${padL - 6}" y="\${yy + 4}" text-anchor="end" font-size="10" fill="var(--muted)">\${val}</text>\`;
      }).join("");

      const xLabels = [0, Math.floor((series.length - 1) / 2), series.length - 1]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((idx) => \`<text x="\${x(idx)}" y="\${H - 6}" text-anchor="middle" font-size="10" fill="var(--muted)">\${esc(series[idx].day.slice(5))}</text>\`)
        .join("");

      const paths = lines.map((l) => {
        const pts = series.map((p, i) => \`\${x(i).toFixed(1)},\${y(Number(p[l.key] || 0)).toFixed(1)}\`);
        const dots = series.length <= 31
          ? series.map((p, i) => \`<circle cx="\${x(i).toFixed(1)}" cy="\${y(Number(p[l.key] || 0)).toFixed(1)}" r="2.5" fill="\${l.color}"><title>\${esc(p.day)} \${esc(l.label)}: \${fmt(p[l.key])}</title></circle>\`).join("")
          : "";
        return \`<polyline fill="none" stroke="\${l.color}" stroke-width="2" points="\${pts.join(" ")}" />\${dots}\`;
      }).join("");

      const legend = lines.map((l) => \`<span><i class="dot" style="background:\${l.color}"></i>\${esc(l.label)}</span>\`).join("");
      return \`<div class="chart-wrap"><svg viewBox="0 0 \${W} \${H}">\${gridLines}\${paths}\${xLabels}</svg></div><div class="legend">\${legend}</div>\`;
    }

    function renderBars(items, labels = {}, colorClass = "", limit = 12) {
      if (!items || items.length === 0) return '<div class="empty">暂无数据（客户端升级接入零 ID 计数后自动展示）</div>';
      const sliced = items.slice(0, limit);
      const max = Math.max(1, ...sliced.map((i) => i.count));
      const sum = sliced.reduce((acc, i) => acc + i.count, 0);
      return '<div class="bar-list">' + sliced.map((item) => {
        const w = Math.max(2, (item.count / max) * 100);
        const label = labels[item.dim] || item.dim;
        return \`<div class="bar-row">
          <div class="bar-head">
            <span class="bar-name" title="\${esc(label)}">\${esc(label)}</span>
            <span class="bar-num">\${fmt(item.count)} (\${pct(item.count, sum)})</span>
          </div>
          <div class="bar-track"><div class="bar-fill \${colorClass}" style="width:\${w.toFixed(1)}%"></div></div>
        </div>\`;
      }).join("") + "</div>";
    }

    function renderLogin() {
      $("app").innerHTML = \`
        <div class="auth-shell">
          <div class="card auth-card">
            <div class="brand" style="margin-bottom:8px;">
              <h1>CodexHost Analytics</h1>
              <span class="pill">D1 · Zero-ID</span>
            </div>
            \${!state.configured
              ? '<p class="err">服务端尚未配置 <code>DASHBOARD_TOKEN</code> Secret，请先通过 wrangler secret put DASHBOARD_TOKEN 配置。</p>'
              : \`<p class="kpi-sub">请输入管理员 Dashboard Token 以查看零 ID 产品统计与插件生态数据。</p>
                 <form id="login-form">
                   <input id="token-input" type="password" autocomplete="current-password" placeholder="DASHBOARD_TOKEN" required />
                   <button class="btn primary" style="width:100%" type="submit">进入看板</button>
                 </form>
                 \${state.error ? '<div class="err">' + esc(state.error) + '</div>' : ''}\`
            }
          </div>
        </div>\`;
      const form = $("login-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const token = $("token-input").value.trim();
          state.error = "";
          const res = await fetch("/v1/dashboard/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!res.ok) {
            state.error = "Token 无效，请重试";
            render();
            return;
          }
          state.authenticated = true;
          await loadData();
        });
      }
    }

    function renderDashboard() {
      const d = state.data;
      const s = d?.summary;
      const mode = state.metricMode;
      const pick = (b) => (b ? b[mode] : []);

      // Remote access official vs self-hosted comparison
      const raUsers = pick(d?.breakdowns?.remoteAccess);
      const findCount = (list, dim) => (list.find((x) => x.dim === dim)?.count ?? 0);
      const officialUsers = findCount(raUsers, "official-relay");
      const selfUsers = findCount(raUsers, "self-hosted-relay");
      const relayTotalUsers = officialUsers + selfUsers;
      const officialPct = relayTotalUsers > 0 ? (officialUsers / relayTotalUsers) * 100 : 50;

      const syncOk = d?.sync?.ok === true;
      const syncText = d?.sync
        ? (syncOk ? \`同步正常 · \${d.sync.sourceCount} 扩展\` : \`同步异常 · \${d.sync.error || "unknown"}\`)
        : "同步状态未知";

      $("app").innerHTML = \`
        <div class="container">
          <header>
            <div class="brand">
              <h1>CodexHost 产品数据看板</h1>
              <span class="pill">Cloudflare D1 · Zero-ID</span>
              <span class="pill \${syncOk ? "ok" : "warn"}">\${esc(syncText)}</span>
            </div>
            <div class="controls">
              <div class="seg" id="range-seg">
                \${[7, 14, 30, 90].map((n) => \`<button data-days="\${n}" class="\${state.days === n ? "active" : ""}">\${n}天</button>\`).join("")}
              </div>
              <div class="seg" id="mode-seg">
                <button data-mode="today" class="\${mode === "today" ? "active" : ""}">今日</button>
                <button data-mode="range" class="\${mode === "range" ? "active" : ""}">近\${state.days}天累计</button>
              </div>
              <button class="btn" id="refresh-btn">\${state.loading ? "刷新中..." : "刷新"}</button>
              <button class="btn" id="theme-btn">深/浅色</button>
              <button class="btn" id="logout-btn">退出</button>
            </div>
          </header>

          \${state.error ? '<div class="card err" style="margin-bottom:16px">' + esc(state.error) + '</div>' : ''}

          \${!d ? '<div class="card empty">正在加载 D1 统计数据...</div>' : \`
            <section class="grid-kpi">
              <div class="card">
                <div class="kpi-label">今日 DAU</div>
                <div class="kpi-value">\${fmt(s.dauToday)}</div>
                <div class="kpi-sub">今日新增 \${fmt(s.newUsersToday)}</div>
              </div>
              <div class="card">
                <div class="kpi-label">本周 WAU / 本月 MAU</div>
                <div class="kpi-value">\${fmt(s.wau)} / \${fmt(s.mau)}</div>
                <div class="kpi-sub">累计装机计数 \${fmt(s.totalInstalls)}</div>
              </div>
              <div class="card">
                <div class="kpi-label">次日 / 7日留存</div>
                <div class="kpi-value">\${s.retention.d1Rate === null ? "—" : (s.retention.d1Rate * 100).toFixed(1) + "%"} / \${s.retention.d7Rate === null ? "—" : (s.retention.d7Rate * 100).toFixed(1) + "%"}</div>
                <div class="kpi-sub">本地日期判重 · 零 ID 聚合</div>
              </div>
              <div class="card">
                <div class="kpi-label">今日远程访问</div>
                <div class="kpi-value">\${fmt(s.remoteUsersToday)}</div>
                <div class="kpi-sub">占今日 DAU \${pct(s.remoteUsersToday, s.dauToday)}</div>
              </div>
              <div class="card">
                <div class="kpi-label">累计插件下载量</div>
                <div class="kpi-value">\${fmt(s.totalExtensionDownloads)}</div>
                <div class="kpi-sub">\${d.extensions.length} 个扩展 · D1 实时计数</div>
              </div>
            </section>

            <section class="grid-2">
              <div class="card">
                <div class="card-title">活跃与新增趋势 <span class="card-sub">近 \${d.days} 天 (UTC)</span></div>
                \${renderLineChart(d.series, [
                  { key: "dau", label: "DAU", color: "var(--accent)" },
                  { key: "newUsers", label: "新增装机", color: "var(--green)" },
                  { key: "remoteUsers", label: "远程访问活跃", color: "var(--purple)" },
                ])}
              </div>
              <div class="card">
                <div class="card-title">远程访问专题：官方 vs 自建 <span class="card-sub">\${mode === "today" ? "今日" : "近" + d.days + "天日活累计"}</span></div>
                <div class="split-box">
                  <div class="split-item">
                    <span class="kpi-label">官方加密中转 (relay.chost.dev)</span>
                    <strong>\${fmt(officialUsers)}</strong>
                  </div>
                  <div class="split-item">
                    <span class="kpi-label">自建加密中转</span>
                    <strong>\${fmt(selfUsers)}</strong>
                  </div>
                </div>
                <div class="split-bar" title="官方 vs 自建中转占比">
                  <div style="width:\${officialPct.toFixed(1)}%;background:var(--accent)"></div>
                  <div style="width:\${(100 - officialPct).toFixed(1)}%;background:var(--purple)"></div>
                </div>
                \${renderLineChart(d.series, [
                  { key: "officialRelayUsers", label: "官方中转日活", color: "var(--accent)" },
                  { key: "selfHostedRelayUsers", label: "自建中转日活", color: "var(--purple)" },
                  { key: "remoteUsers", label: "全部远程访问日活", color: "var(--amber)" },
                ])}
              </div>
            </section>

            <section class="card" style="margin-bottom:16px">
              <div class="card-title">全类型远程访问通道分布 <span class="card-sub">仅统计实际发生已认证远程连接的通道</span></div>
              \${renderBars(raUsers, CHANNEL_LABELS, "purple", 12)}
            </section>

            <section class="grid-3">
              <div class="card">
                <div class="card-title">20 个 Harness 使用排行 <span class="card-sub">实际发消息活跃</span></div>
                \${renderBars(pick(d.breakdowns.harnesses), {}, "purple", 20)}
              </div>
              <div class="card">
                <div class="card-title">入口形态 <span class="card-sub">Desktop vs Web</span></div>
                \${renderBars(pick(d.breakdowns.surfaces), SURFACE_LABELS, "")}
              </div>
              <div class="card">
                <div class="card-title">版本分布 <span class="card-sub">CodexHost & Codex Desktop</span></div>
                \${renderBars(pick(d.breakdowns.appVersions), {}, "", 8)}
                <div style="height:14px"></div>
                <div class="card-title" style="font-size:14px;margin-bottom:8px">Codex Desktop 版本</div>
                \${renderBars(pick(d.breakdowns.codexVersions), {}, "amber", 8)}
              </div>
            </section>

            <section class="grid-3">
              <div class="card">
                <div class="card-title">系统与架构</div>
                \${renderBars(pick(d.breakdowns.osArch), {}, "")}
              </div>
              <div class="card">
                <div class="card-title">国家 / 地区 <span class="card-sub">CF 边缘推断，不存 IP</span></div>
                \${renderBars(pick(d.breakdowns.countries), {}, "green", 12)}
              </div>
              <div class="card">
                <div class="card-title">界面语言 <span class="card-sub">粗粒度主语言码</span></div>
                \${renderBars(pick(d.breakdowns.uiLanguages), LANGUAGE_LABELS, "purple", 10)}
              </div>
            </section>

            <section class="card">
              <div class="card-title">插件市场生态 <span class="card-sub">累计下载量 · 区间新增</span></div>
              <div class="table-wrap"><table>
                <thead><tr>
                  <th>扩展 ID</th>
                  <th class="num">累计下载</th>
                  <th class="num">近\${d.days}天新增</th>
                  <th class="num">更新时间 (UTC)</th>
                </tr></thead>
                <tbody>
                  \${d.extensions.map((e) => \`<tr>
                    <td><code>\${esc(e.id)}</code></td>
                    <td class="num"><strong>\${fmt(e.downloads)}</strong></td>
                    <td class="num">\${fmt(e.rangeDownloads)}</td>
                    <td class="num" style="color:var(--muted)">\${esc((e.updatedAt || "").slice(0, 19).replace("T", " "))}</td>
                  </tr>\`).join("")}
                </tbody>
              </table></div>
            </section>

            <footer>
              <span>数据生成时间 (UTC)：\${esc(d.generatedAt)}</span>
              <span>去重逻辑全在客户端本地完成；服务端零设备表、零设备 ID、零 IP，仅存聚合计数</span>
            </footer>
          \`}
        </div>\`;

      $("range-seg")?.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-days]");
        if (!btn) return;
        state.days = Number(btn.dataset.days);
        loadData();
      });
      $("mode-seg")?.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-mode]");
        if (!btn) return;
        state.metricMode = btn.dataset.mode;
        render();
      });
      $("refresh-btn")?.addEventListener("click", () => loadData());
      $("theme-btn")?.addEventListener("click", () => {
        const cur = document.documentElement.dataset.theme;
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("ch-dash-theme", next); } catch {}
      });
      $("logout-btn")?.addEventListener("click", async () => {
        await fetch("/v1/dashboard/logout", { method: "POST" });
        state.authenticated = false;
        state.data = null;
        render();
      });
    }

    async function loadData() {
      state.loading = true;
      state.error = "";
      render();
      try {
        const res = await fetch("/v1/dashboard/overview?days=" + state.days);
        if (res.status === 401) {
          state.authenticated = false;
          state.data = null;
          return;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        state.data = await res.json();
      } catch (err) {
        state.error = "加载失败：" + (err?.message || err);
      } finally {
        state.loading = false;
        render();
      }
    }

    function render() {
      if (!state.authenticated) renderLogin();
      else renderDashboard();
    }

    try {
      const savedTheme = localStorage.getItem("ch-dash-theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        document.documentElement.dataset.theme = savedTheme;
      }
    } catch {}

    render();
    if (state.authenticated) loadData();
  </script>
</body>
</html>`;
}
