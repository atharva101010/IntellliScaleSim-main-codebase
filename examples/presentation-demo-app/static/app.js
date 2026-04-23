const byId = (id) => document.getElementById(id);

const state = {
  latencyPoints: [],
  maxPoints: 24,
};

function showToast(message, isError = false) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.style.background = isError ? "#7f1d1d" : "#0d1b2a";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function setJsonResult(elId, payload) {
  byId(elId).textContent = JSON.stringify(payload, null, 2);
}

async function apiGet(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Request failed (${res.status})`);
  }
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Request failed (${res.status})`);
  }
  return data;
}

function updateKpis(statsPayload) {
  const stats = statsPayload?.data || {};
  byId("kpiRequests").textContent = `${stats.request_count ?? 0}`;
  byId("kpiLatency").textContent = `${stats.avg_latency_ms ?? 0} ms`;
  byId("kpiActive").textContent = `${stats.active_requests ?? 0}`;
  byId("kpiErrors").textContent = `${stats.error_count ?? 0}`;

  state.latencyPoints.push(Number(stats.avg_latency_ms ?? 0));
  if (state.latencyPoints.length > state.maxPoints) {
    state.latencyPoints.shift();
  }
  renderLatencyChart();
}

function renderLatencyChart() {
  const svg = byId("latencyChart");
  const values = state.latencyPoints;
  const width = 600;
  const height = 180;
  const padding = 14;

  if (values.length < 2) {
    svg.innerHTML = "";
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  const stepX = (width - padding * 2) / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${padding + (values.length - 1) * stepX},${height - padding}`;

  svg.innerHTML = `
    <polyline points="${areaPoints}" fill="rgba(43,80,170,0.15)" stroke="none"></polyline>
    <polyline points="${points}" fill="none" stroke="#2b50aa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  `;
}

async function refreshStats() {
  const payload = await apiGet("/api/stats");
  updateKpis(payload);
  return payload;
}

function buildCatalogPath(form) {
  const page = form.page.value || "1";
  const pageSize = form.page_size.value || "8";
  const sort = form.sort.value || "id";
  return `/api/catalog?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}&sort=${encodeURIComponent(sort)}`;
}

function bindForms() {
  byId("catalogForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = await apiGet(buildCatalogPath(e.currentTarget));
      setJsonResult("catalogResult", payload);
      showToast("Catalog loaded");
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  byId("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = e.currentTarget.q.value || "widget";
    const limit = e.currentTarget.limit.value || "10";
    try {
      const payload = await apiGet(`/api/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`);
      setJsonResult("searchResult", payload);
      showToast("Search completed");
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  byId("cpuForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const complexity = e.currentTarget.complexity.value || "7000";
    try {
      const payload = await apiGet(`/api/work/cpu?complexity=${encodeURIComponent(complexity)}`);
      setJsonResult("stressResult", payload);
      showToast("CPU task executed");
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  byId("memoryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const size = e.currentTarget.size_mb.value || "80";
    const hold = e.currentTarget.hold_ms.value || "1200";
    try {
      const payload = await apiGet(`/api/work/memory?size_mb=${encodeURIComponent(size)}&hold_ms=${encodeURIComponent(hold)}`);
      setJsonResult("stressResult", payload);
      showToast("Memory task executed");
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  byId("ioForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const size = e.currentTarget.size_kb.value || "1024";
    try {
      const payload = await apiGet(`/api/work/io?size_kb=${encodeURIComponent(size)}`);
      setJsonResult("stressResult", payload);
      showToast("IO task executed");
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  byId("checkoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const rounds = Number(e.currentTarget.fraud_check_rounds.value || "25000");
    const body = {
      user_id: "presentation-user",
      fraud_check_rounds: rounds,
      items: [
        { sku: "SKU-1001", qty: 2, price: 15.5 },
        { sku: "SKU-1030", qty: 1, price: 42.0 },
      ],
    };

    try {
      const payload = await apiPost("/api/checkout", body);
      setJsonResult("stressResult", payload);
      showToast("Checkout generated");
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function runSmoke() {
  const checks = [
    "/healthz",
    "/readyz",
    "/api/catalog?page=1&page_size=3",
    "/api/search?q=widget&limit=3",
  ];

  for (const endpoint of checks) {
    await apiGet(endpoint);
  }
  showToast("Smoke test passed");
  await refreshStats();
}

function setupHeaderActions() {
  byId("refreshStatsBtn").addEventListener("click", async () => {
    try {
      await refreshStats();
      showToast("Stats refreshed");
    } catch (err) {
      showToast(err.message, true);
    }
  });

  byId("runSmokeBtn").addEventListener("click", async () => {
    try {
      await runSmoke();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function bootstrap() {
  bindForms();
  setupHeaderActions();

  try {
    await refreshStats();
  } catch (err) {
    showToast(err.message, true);
  }

  window.setInterval(async () => {
    try {
      await refreshStats();
    } catch (_) {
      // Keep UI responsive if periodic refresh fails.
    }
  }, 4000);
}

bootstrap();
