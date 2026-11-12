export const PALETTE = [
  "#0f766e",
  "#1d4ed8",
  "#ea580c",
  "#7c3aed",
  "#be123c",
  "#15803d",
  "#a16207",
  "#0e7490",
  "#db2777",
  "#4338ca",
];

export const AGE_ORDER = ["10대", "20대", "30대", "40대", "50대", "60대 이상"];

export const whiteBgPlugin = {
  id: "whiteBg",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

export async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} 로드 실패 (${res.status})`);
  return res.json();
}

export function parseDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "-").replace("T", " ").replace(/\.\d+$/, "");
  const match = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );
  if (!match) return null;
  const [, y, m, d, hh = "0", mm = "0", ss = "0"] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatNumber(value) {
  return Number(value).toLocaleString("ko-KR");
}

export function formatPercent(part, whole) {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export function blankLabel(value) {
  return value == null || String(value).trim() === "" ? "(미입력)" : String(value).trim();
}

export function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const label = keyFn(row);
    if (label == null) continue;
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function fieldCounter(rows, field) {
  return countBy(rows, (row) => blankLabel(row[field]));
}

export function topN(entries, n = 10) {
  return entries.slice(0, n);
}

export function setKpi(id, value, sub = "") {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
  const subEl = document.getElementById(`${id}-sub`);
  if (subEl) subEl.textContent = sub;
}

export function baseOptions({ horizontal = false, legend = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 28, right: 18, bottom: 8, left: 8 } },
    plugins: {
      legend: {
        display: legend,
        position: "bottom",
        labels: {
          boxWidth: 14,
          boxHeight: 14,
          color: "#111827",
          font: { weight: "700", size: 12 },
          padding: 16,
        },
      },
      tooltip: { enabled: true },
      datalabels: {
        color: "#111827",
        font: { weight: "700", size: 12 },
        clamp: true,
        clip: false,
        anchor: "end",
        align: "end",
        offset: 4,
        formatter: (value) => (value ? formatNumber(value) : ""),
      },
    },
    scales: {
      x: {
        grid: { color: "#f3f4f6" },
        ticks: {
          color: "#374151",
          font: { weight: "700", size: 12 },
          ...(horizontal ? { precision: 0 } : {}),
        },
        ...(horizontal ? { beginAtZero: true } : {}),
      },
      y: {
        beginAtZero: !horizontal,
        grid: { color: "#f3f4f6" },
        ticks: {
          color: "#374151",
          precision: 0,
          font: { weight: "700", size: 12 },
        },
      },
    },
  };
}

export function makeBar(canvasId, labels, values, { horizontal = false, colors, label } = {}) {
  const opts = baseOptions({ horizontal });
  if (horizontal) opts.indexAxis = "y";

  return new Chart(document.getElementById(canvasId), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: colors || labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 0,
          borderRadius: 8,
          maxBarThickness: horizontal ? 26 : 52,
        },
      ],
    },
    options: opts,
    plugins: [whiteBgPlugin],
  });
}

export function makeDoughnutSimple(canvasId, labels, values, colors) {
  return new Chart(document.getElementById(canvasId), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors || labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 3,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 8 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
        datalabels: { display: false },
      },
    },
    plugins: [whiteBgPlugin],
  });
}

export function renderStatList(elementId, labels, values, colors) {
  const total = values.reduce((a, b) => a + b, 0);
  document.getElementById(elementId).innerHTML = labels
    .map((label, i) => {
      const value = values[i];
      const color = colors[i % colors.length];
      return `<li>
        <span class="swatch" style="background:${color}"></span>
        <span class="label">${label}</span>
        <span class="meta">${formatNumber(value)}명 · ${formatPercent(value, total)}</span>
      </li>`;
    })
    .join("");
}

export function buildCrossCounts(userMap, rows, userIdField, rowField, colField) {
  const matrix = new Map();
  for (const row of rows) {
    const user = userMap.get(row[userIdField]);
    if (!user) continue;
    const r = blankLabel(user[rowField]);
    const c = blankLabel(user[colField]);
    if (!matrix.has(r)) matrix.set(r, new Map());
    const cols = matrix.get(r);
    cols.set(c, (cols.get(c) || 0) + 1);
  }
  return matrix;
}

export function renderMatrixTable(elementId, matrix, rowOrder, colOrder) {
  const rows = rowOrder;
  const cols = colOrder;
  const values = [];
  for (const r of rows) {
    for (const c of cols) values.push(matrix.get(r)?.get(c) || 0);
  }
  const max = Math.max(...values, 1);
  const colTotals = cols.map((c) =>
    rows.reduce((sum, r) => sum + (matrix.get(r)?.get(c) || 0), 0)
  );
  const grand = colTotals.reduce((a, b) => a + b, 0);

  const head = `<tr><th></th>${cols.map((c) => `<th>${c}</th>`).join("")}<th>합계</th></tr>`;
  const body = rows
    .map((r) => {
      const cells = cols.map((c) => {
        const v = matrix.get(r)?.get(c) || 0;
        const cls = v === 0 ? "is-zero" : v >= max * 0.7 ? "is-hot" : "";
        return `<td class="${cls}">${v ? formatNumber(v) : "-"}</td>`;
      });
      const rowTotal = cols.reduce((sum, c) => sum + (matrix.get(r)?.get(c) || 0), 0);
      return `<tr><td>${r}</td>${cells.join("")}<td>${formatNumber(rowTotal)}</td></tr>`;
    })
    .join("");
  const foot = `<tr><td>합계</td>${colTotals
    .map((v) => `<td>${formatNumber(v)}</td>`)
    .join("")}<td>${formatNumber(grand)}</td></tr>`;

  document.getElementById(elementId).innerHTML = `
    <table class="matrix-table">
      <thead>${head}</thead>
      <tbody>${body}</tbody>
      <tfoot>${foot}</tfoot>
    </table>
  `;
}

function slugifyFilename(text) {
  return String(text || "card")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/·/g, "-")
    .slice(0, 60);
}

async function saveCardImage(card, button) {
  if (typeof html2canvas !== "function") {
    alert("이미지 저장 라이브러리를 불러오지 못했습니다.");
    return;
  }

  const title = card.querySelector("h2")?.textContent?.trim() || "dashboard-card";
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "저장 중…";

  const scrollables = [...card.querySelectorAll(".rank-list, .matrix-wrap, .message-list")];
  const prevStyles = scrollables.map((el) => ({
    el,
    maxHeight: el.style.maxHeight,
    overflow: el.style.overflow,
  }));
  scrollables.forEach((el) => {
    el.style.maxHeight = "none";
    el.style.overflow = "visible";
  });

  try {
    const canvas = await html2canvas(card, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: card.scrollWidth,
      windowHeight: card.scrollHeight,
    });
    const link = document.createElement("a");
    link.download = `sbd712-${slugifyFilename(title)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error(error);
    alert("이미지 저장에 실패했습니다.");
  } finally {
    prevStyles.forEach(({ el, maxHeight, overflow }) => {
      el.style.maxHeight = maxHeight;
      el.style.overflow = overflow;
    });
    button.disabled = false;
    button.textContent = originalText;
  }
}

export function setupCardExports() {
  const cards = [
    ...document.querySelectorAll(".chart-grid > article"),
    ...document.querySelectorAll("main > .table-section"),
    ...document.querySelectorAll("main > .card-section"),
  ];

  cards.forEach((card) => {
    if (card.parentElement?.classList.contains("card-block")) return;

    const wrap = document.createElement("div");
    wrap.className = "card-block";
    if (card.classList.contains("chart-wide")) {
      wrap.classList.add("chart-wide");
      card.classList.remove("chart-wide");
    }

    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "save-image-btn";
    button.textContent = "이미지 저장";
    button.addEventListener("click", () => saveCardImage(card, button));
    wrap.appendChild(button);
  });
}

export function markActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach((link) => {
    const href = link.getAttribute("href")?.replace("./", "") || "";
    const active =
      href === path ||
      (path === "" && href === "index.html") ||
      (path === "index.html" && href === "index.html");
    link.classList.toggle("is-active", active);
  });
}
