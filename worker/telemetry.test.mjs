import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker, { resetSyncState } from "./worker.js";

const SCHEMA_SQL = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

/** Minimal Cloudflare D1-compatible adapter backed by real in-memory SQLite (`node:sqlite`). */
function createSqliteD1() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(SCHEMA_SQL);

  function wrapStatement(sql, params = []) {
    return {
      sql,
      params,
      bind(...args) {
        return wrapStatement(sql, args);
      },
      async first() {
        const stmt = sqlite.prepare(sql);
        const row = stmt.get(...params);
        return row === undefined ? null : { ...row };
      },
      async all() {
        const stmt = sqlite.prepare(sql);
        const rows = stmt.all(...params).map((r) => ({ ...r }));
        return { success: true, results: rows };
      },
      async run() {
        const stmt = sqlite.prepare(sql);
        const info = stmt.run(...params);
        return { success: true, meta: { changes: info.changes } };
      },
    };
  }

  return {
    sqlite,
    prepare(sql) {
      return wrapStatement(sql);
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const s of statements) {
          const stmt = sqlite.prepare(s.sql);
          if (/^\s*SELECT\b/iu.test(s.sql)) {
            results.push({
              success: true,
              results: stmt.all(...s.params).map((r) => ({ ...r })),
            });
          } else {
            const info = stmt.run(...s.params);
            results.push({ success: true, results: [], meta: { changes: info.changes } });
          }
        }
        sqlite.exec("COMMIT");
        return results;
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
  };
}

function makeCtx() {
  const pending = [];
  return {
    waitUntil(p) {
      pending.push(Promise.resolve(p));
    },
    async flush() {
      await Promise.all(pending);
    },
  };
}

async function withFakeNow(msOrFn, fn) {
  const originalNow = Date.now;
  Date.now = typeof msOrFn === "function" ? msOrFn : () => msOrFn;
  resetSyncState();
  try {
    return await fn();
  } finally {
    Date.now = originalNow;
    resetSyncState();
  }
}

test("D1 POST /install/:id atomically increments totals and daily counts, served by GET /stats.json", async () => {
  const db = createSqliteD1();
  const env = { STATS_DB: db };
  const ctx = makeCtx();

  await withFakeNow(Date.parse("2026-11-28T10:00:00Z"), async () => {
    const r1 = await worker.fetch(
      new Request("https://ext-stats.chost.dev/install/sidebar-thread-tree", { method: "POST" }),
      env,
      ctx,
    );
    assert.equal(r1.status, 200);
    assert.deepEqual(await r1.json(), { id: "sidebar-thread-tree", downloads: 1 });

    const r2 = await worker.fetch(
      new Request("https://ext-stats.chost.dev/install/sidebar-thread-tree", { method: "POST" }),
      env,
      ctx,
    );
    assert.equal(r2.status, 200);
    assert.deepEqual(await r2.json(), { id: "sidebar-thread-tree", downloads: 2 });

    const statsRes = await worker.fetch(
      new Request("https://ext-stats.chost.dev/stats.json", { method: "GET" }),
      env,
      ctx,
    );
    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.headers.get("cache-control"), "public, max-age=300, s-maxage=300");
    const stats = await statsRes.json();
    assert.deepEqual(stats.downloads, { "sidebar-thread-tree": 2 });

    const healthRes = await worker.fetch(
      new Request("https://ext-stats.chost.dev/health", { method: "GET" }),
      env,
      ctx,
    );
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.storage, "d1");
  });
});

test("POST /v1/telemetry/heartbeat enforces zero-ID payloads, aggregates deltas without double counting, and tracks official vs self-hosted remote access", async () => {
  const db = createSqliteD1();
  const env = { STATS_DB: db, DASHBOARD_TOKEN: "test-admin-secret-123" };
  const ctx = makeCtx();

  await withFakeNow(Date.parse("2026-11-28T02:00:00Z"), async () => {
    // Reject any payload containing client identifiers
    const withId = await worker.fetch(
      new Request("https://ext-stats.chost.dev/v1/telemetry/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installId: "11111111-1111-4111-8111-111111111111",
          dailyActive: true,
        }),
      }),
      env,
      ctx,
    );
    assert.equal(withId.status, 400);

    // Reject empty payloads
    const empty = await worker.fetch(
      new Request("https://ext-stats.chost.dev/v1/telemetry/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      env,
      ctx,
    );
    assert.equal(empty.status, 400);

    // First heartbeat from machine A (morning: Desktop only)
    const req1 = new Request("https://ext-stats.chost.dev/v1/telemetry/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newInstall: true,
        dailyActive: true,
        weeklyActive: true,
        monthlyActive: true,
        appVersion: "0.28.2",
        codexDesktopVersion: "26.1023.50603",
        os: "darwin",
        arch: "arm64",
        uiLanguage: "zh-CN",
        surfaces: ["codex-desktop"],
        harnesses: ["codex", "claude-code", "invalid-harness-should-drop"],
      }),
    });
    Object.defineProperty(req1, "cf", { value: { country: "CN" } });
    const h1 = await worker.fetch(req1, env, ctx);
    assert.equal(h1.status, 200);
    assert.deepEqual(await h1.json(), { ok: true, day: "2026-11-28" });

    // Same-day delta from machine A (afternoon: mobile via Official Relay + Pi)
    // Does NOT repeat dailyActive, version, os, uiLanguage, or country!
    const req2 = new Request("https://ext-stats.chost.dev/v1/telemetry/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surfaces: ["web", "web-mobile"],
        harnesses: ["pi"],
        remoteAccess: ["official-relay"],
        remoteAny: true,
      }),
    });
    Object.defineProperty(req2, "cf", { value: { country: "CN" } });
    const h2 = await worker.fetch(req2, env, ctx);
    assert.equal(h2.status, 200);

    // Heartbeat from machine B using self-hosted relay + tailscale-serve
    const reqB = new Request("https://ext-stats.chost.dev/v1/telemetry/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newInstall: true,
        dailyActive: true,
        weeklyActive: true,
        monthlyActive: true,
        appVersion: "0.28.2",
        os: "linux",
        arch: "x64",
        uiLanguage: "en",
        surfaces: ["web"],
        harnesses: ["antigravity"],
        remoteAccess: ["self-hosted-relay", "tailscale-serve"],
        remoteAny: true,
      }),
    });
    Object.defineProperty(reqB, "cf", { value: { country: "US" } });
    assert.equal((await worker.fetch(reqB, env, ctx)).status, 200);

    // Dashboard overview via Bearer token
    const overviewRes = await worker.fetch(
      new Request("https://ext-stats.chost.dev/v1/dashboard/overview?days=7", {
        headers: { Authorization: "Bearer test-admin-secret-123" },
      }),
      env,
      ctx,
    );
    assert.equal(overviewRes.status, 200);
    const data = await overviewRes.json();

    assert.equal(data.summary.dauToday, 2);
    assert.equal(data.summary.newUsersToday, 2);
    assert.equal(data.summary.wau, 2);
    assert.equal(data.summary.mau, 2);
    assert.equal(data.summary.totalInstalls, 2);
    assert.equal(data.summary.remoteUsersToday, 2);

    assert.deepEqual(data.breakdowns.appVersions.today, [{ dim: "0.28.2", count: 2 }]);
    assert.deepEqual(data.breakdowns.countries.today, [
      { dim: "CN", count: 1 },
      { dim: "US", count: 1 },
    ]);
    assert.deepEqual(data.breakdowns.uiLanguages.today, [
      { dim: "en", count: 1 },
      { dim: "zh", count: 1 },
    ]);
    assert.deepEqual(data.breakdowns.remoteAccess.today, [
      { dim: "official-relay", count: 1 },
      { dim: "self-hosted-relay", count: 1 },
      { dim: "tailscale-serve", count: 1 },
    ]);
    assert.deepEqual(
      data.breakdowns.harnesses.today.map((x) => x.dim),
      ["antigravity", "claude-code", "codex", "pi"],
    );
  });
});

test("Zero-ID client-computed D1 and D7 retention booleans credit exact cohort days", async () => {
  const db = createSqliteD1();
  const env = { STATS_DB: db, DASHBOARD_TOKEN: "secret-key" };
  const ctx = makeCtx();

  const send = async (dayIso, body) =>
    withFakeNow(Date.parse(dayIso), () =>
      worker.fetch(
        new Request("https://ext-stats.chost.dev/v1/telemetry/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        env,
        ctx,
      ),
    );

  // Day 0 (2026-11-01): 2 new installs join
  assert.equal(
    (
      await send("2026-11-01T09:00:00Z", {
        newInstall: true,
        dailyActive: true,
        weeklyActive: true,
        monthlyActive: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await send("2026-11-01T10:00:00Z", {
        newInstall: true,
        dailyActive: true,
        weeklyActive: true,
        monthlyActive: true,
      })
    ).status,
    200,
  );
  // Day 1 (2026-11-02): 1 returns with retainedD1: true
  assert.equal(
    (await send("2026-11-02T09:00:00Z", { dailyActive: true, retainedD1: true })).status,
    200,
  );
  // Day 7 (2026-11-08): 1 returns with retainedD7: true
  assert.equal(
    (
      await send("2026-11-08T09:00:00Z", {
        dailyActive: true,
        weeklyActive: true,
        retainedD7: true,
      })
    ).status,
    200,
  );

  await withFakeNow(Date.parse("2026-11-08T12:00:00Z"), async () => {
    const res = await worker.fetch(
      new Request("https://ext-stats.chost.dev/v1/dashboard/overview?days=14", {
        headers: { Authorization: "Bearer secret-key" },
      }),
      env,
      ctx,
    );
    const data = await res.json();
    assert.equal(data.summary.totalInstalls, 2);
    assert.equal(data.summary.mau, 2);
    assert.equal(data.summary.retention.d1Cohort, 2);
    assert.equal(data.summary.retention.d1Returned, 1);
    assert.equal(data.summary.retention.d1Rate, 0.5);
    assert.equal(data.summary.retention.d7Cohort, 2);
    assert.equal(data.summary.retention.d7Returned, 1);
    assert.equal(data.summary.retention.d7Rate, 0.5);
  });

  // Verify database schema contains NO device tables
  const tables = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all();
  const tableNames = tables.results.map((r) => r.name);
  assert.equal(tableNames.includes("devices"), false);
  assert.equal(tableNames.includes("daily_device_state"), false);
});

test("Dashboard cookie auth rejects invalid tokens and grants signed session cookie", async () => {
  const db = createSqliteD1();
  const env = { STATS_DB: db, DASHBOARD_TOKEN: "top-secret-token" };
  const ctx = makeCtx();

  const unauth = await worker.fetch(
    new Request("https://ext-stats.chost.dev/v1/dashboard/overview"),
    env,
    ctx,
  );
  assert.equal(unauth.status, 401);

  const badLogin = await worker.fetch(
    new Request("https://ext-stats.chost.dev/v1/dashboard/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "wrong" }),
    }),
    env,
    ctx,
  );
  assert.equal(badLogin.status, 401);

  const goodLogin = await worker.fetch(
    new Request("https://ext-stats.chost.dev/v1/dashboard/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "top-secret-token" }),
    }),
    env,
    ctx,
  );
  assert.equal(goodLogin.status, 200);
  const setCookie = goodLogin.headers.get("set-cookie");
  assert.ok(setCookie?.startsWith("__Host-ch_dash_session=v1."));
  assert.ok(setCookie.includes("HttpOnly"));
  assert.ok(setCookie.includes("Secure"));

  const cookiePair = setCookie.split(";")[0];

  const authedOverview = await worker.fetch(
    new Request("https://ext-stats.chost.dev/v1/dashboard/overview?days=7", {
      headers: { Cookie: cookiePair },
    }),
    env,
    ctx,
  );
  assert.equal(authedOverview.status, 200);

  const htmlRes = await worker.fetch(
    new Request("https://ext-stats.chost.dev/dashboard", {
      headers: { Cookie: cookiePair },
    }),
    env,
    ctx,
  );
  assert.equal(htmlRes.status, 200);
  const html = await htmlRes.text();
  assert.ok(html.includes('"authenticated":true'));
});
