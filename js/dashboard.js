import { markActiveNav } from "./common.js";

Chart.register(ChartDataLabels);

const DATA_FILES = {
  users: "./data/user.json",
  stamps: "./data/stamp.json",
  usedCoupons: "./data/usedCoupon.json",
  vouchers: "./data/issuedCouponVoucher.json",
  tests: "./data/test.json",
  messages: "./data/supportMessage.json",
};

const COLORS = {
  signup: "#0f766e",
  stamp: "#1d4ed8",
  voucher: "#7c3aed",
  coupon: "#ea580c",
  female: "#e11d48",
  male: "#2563eb",
};

const PALETTE = [
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

const AGE_ORDER = ["10대", "20대", "30대", "40대", "50대", "60대 이상"];
const statusEl = document.getElementById("load-status");

const whiteBgPlugin = {
  id: "whiteBg",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} 로드 실패 (${res.status})`);
  return res.json();
}

function parseDate(value) {
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

function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("ko-KR");
}

function formatWon(value) {
  return `${formatNumber(value)}원`;
}

function formatPercent(part, whole) {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const label = keyFn(row);
    if (label == null) continue;
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function fieldCounter(rows, field) {
  return countBy(rows, (row) => {
    const raw = row[field];
    return raw == null || String(raw).trim() === "" ? "(미입력)" : String(raw).trim();
  });
}

function topN(entries, n = 10) {
  return entries.slice(0, n);
}

function sumBy(rows, field) {
  return rows.reduce((acc, row) => acc + Number(row[field] || 0), 0);
}

function setKpi(id, value, sub = "") {
  document.getElementById(id).textContent = value;
  const subEl = document.getElementById(`${id}-sub`);
  if (subEl) subEl.textContent = sub;
}

function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function baseOptions({ horizontal = false, legend = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 28, right: 18, bottom: 8, left: 8 },
    },
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

function makeBar(canvasId, labels, values, { horizontal = false, colors, label } = {}) {
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

function makeDoughnutSimple(canvasId, labels, values, colors) {
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

function renderStatList(elementId, labels, values, colors) {
  const total = values.reduce((a, b) => a + b, 0);
  const el = document.getElementById(elementId);
  el.innerHTML = labels
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

function buildHourCounts(rows, field, startHour = 8, endHour = 23) {
  const counts = {};
  for (let h = startHour; h <= endHour; h += 1) counts[h] = 0;

  for (const row of rows) {
    const date = parseDate(row[field]);
    if (!date) continue;
    const hour = date.getHours();
    if (hour < startHour || hour > endHour) continue;
    counts[hour] += 1;
  }

  const labels = [];
  const values = [];
  for (let h = startHour; h <= endHour; h += 1) {
    labels.push(`${h}시`);
    values.push(counts[h]);
  }
  return { labels, values };
}

function buildDailySeries(rows, field) {
  const map = new Map();
  for (const row of rows) {
    const date = parseDate(row[field]);
    if (!date) continue;
    const key = toDayKey(date);
    map.set(key, (map.get(key) || 0) + 1);
  }
  const labels = [...map.keys()].sort();
  return {
    labels,
    values: labels.map((d) => map.get(d)),
  };
}

function shopStats(usedCoupons) {
  const map = new Map();
  for (const row of usedCoupons) {
    const shop = String(row["사용 상점명"] || "(미입력)").trim();
    const amount = Number(row["쿠폰 금액"] || 0);
    if (!map.has(shop)) map.set(shop, { count: 0, amount: 0 });
    const item = map.get(shop);
    item.count += 1;
    item.amount += amount;
  }
  return [...map.entries()]
    .map(([shop, stat]) => [shop, stat.count, stat.amount])
    .sort((a, b) => b[1] - a[1]);
}

function voucherReasonStats(vouchers) {
  const map = new Map();
  for (const row of vouchers) {
    const reason = String(row["발급사유"] || "(미입력)").trim();
    const amount = Number(row["금액"] || 0);
    if (!map.has(reason)) map.set(reason, { count: 0, amount: 0 });
    const item = map.get(reason);
    item.count += 1;
    item.amount += amount;
  }
  return [...map.entries()]
    .map(([reason, stat]) => [reason, stat.count, stat.amount])
    .sort((a, b) => b[1] - a[1]);
}

function blankLabel(value) {
  return value == null || String(value).trim() === "" ? "(미입력)" : String(value).trim();
}

function buildCouponDemo(users, usedCoupons, field, order = null) {
  const userMap = new Map(users.map((u) => [u["사용자 식별자"], u]));
  const memberCounts = new Map();
  for (const user of users) {
    const key = blankLabel(user[field]);
    memberCounts.set(key, (memberCounts.get(key) || 0) + 1);
  }

  const useCounts = new Map();
  const useAmounts = new Map();
  const usersWhoUsed = new Map();

  for (const row of usedCoupons) {
    const user = userMap.get(row["사용자 식별자"]);
    if (!user) continue;
    const key = blankLabel(user[field]);
    useCounts.set(key, (useCounts.get(key) || 0) + 1);
    useAmounts.set(key, (useAmounts.get(key) || 0) + Number(row["쿠폰 금액"] || 0));
    if (!usersWhoUsed.has(key)) usersWhoUsed.set(key, new Set());
    usersWhoUsed.get(key).add(row["사용자 식별자"]);
  }

  let keys = order
    ? order.filter((k) => memberCounts.has(k) || useCounts.has(k))
    : [...new Set([...memberCounts.keys(), ...useCounts.keys()])];

  if (!order) {
    keys.sort((a, b) => (useCounts.get(b) || 0) - (useCounts.get(a) || 0));
  }

  return keys.map((key) => {
    const members = memberCounts.get(key) || 0;
    const uses = useCounts.get(key) || 0;
    const amount = useAmounts.get(key) || 0;
    const usedPeople = usersWhoUsed.get(key)?.size || 0;
    return {
      key,
      members,
      uses,
      amount,
      usedPeople,
      rate: members ? (usedPeople / members) * 100 : 0,
    };
  });
}

function buildCrossCounts(users, usedCoupons, rowField, colField) {
  const userMap = new Map(users.map((u) => [u["사용자 식별자"], u]));
  const matrix = new Map();

  for (const row of usedCoupons) {
    const user = userMap.get(row["사용자 식별자"]);
    if (!user) continue;
    const r = blankLabel(user[rowField]);
    const c = blankLabel(user[colField]);
    if (!matrix.has(r)) matrix.set(r, new Map());
    const cols = matrix.get(r);
    cols.set(c, (cols.get(c) || 0) + 1);
  }

  return matrix;
}

function renderMatrixTable(elementId, matrix, rowOrder, colOrder) {
  const rows = rowOrder;
  const cols = colOrder;
  const values = [];

  for (const r of rows) {
    for (const c of cols) {
      values.push(matrix.get(r)?.get(c) || 0);
    }
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

function renderRankList(elementId, items, { variant = "stamp", showAmount = false } = {}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  document.getElementById(elementId).innerHTML = items
    .map((item, index) => {
      const pct = (item.count / max) * 100;
      const amountHtml = showAmount ? `<div>${formatWon(item.amount)}</div>` : "";
      return `<article class="rank-item is-${variant}">
        <span class="rank-no">${index + 1}</span>
        <div class="rank-main">
          <span class="rank-name" title="${item.name}">${item.name}</span>
          <div class="rank-bar"><span style="width:${pct}%"></span></div>
        </div>
        <div class="rank-meta">
          <strong>${formatNumber(item.count)}건</strong>
          <div>${item.share}</div>
          ${amountHtml}
        </div>
      </article>`;
    })
    .join("");
}

function bindToggleGroup(attrName, onChange) {
  const buttons = [...document.querySelectorAll(`[data-${attrName}]`)];
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      onChange(btn.dataset[attrName]);
    });
  });
}

async function main() {
  markActiveNav();
  try {
    const [users, stamps, usedCoupons, vouchers, tests, messages] = await Promise.all([
      loadJson(DATA_FILES.users),
      loadJson(DATA_FILES.stamps),
      loadJson(DATA_FILES.usedCoupons),
      loadJson(DATA_FILES.vouchers),
      loadJson(DATA_FILES.tests),
      loadJson(DATA_FILES.messages),
    ]);

    const stampUsers = new Set(stamps.map((r) => r["사용자 식별자"]));
    const voucherUsers = new Set(vouchers.map((r) => r["사용자 식별자"]));
    const usedUsers = new Set(usedCoupons.map((r) => r["사용자 식별자"]));
    const converted = [...voucherUsers].filter((id) => usedUsers.has(id)).length;
    const usedAmount = sumBy(usedCoupons, "쿠폰 금액");
    const voucherAmount = sumBy(vouchers, "금액");
    const avgStamps = stampUsers.size ? stamps.length / stampUsers.size : 0;

    const useDelays = [];
    for (const row of usedCoupons) {
      const issued = parseDate(row["발급일시"]);
      const used = parseDate(row["사용일시"]);
      if (!issued || !used) continue;
      useDelays.push((used - issued) / 60000);
    }

    setKpi("kpi-users", formatNumber(users.length), `스탬프 참여 ${formatNumber(stampUsers.size)}명`);
    setKpi("kpi-stamps", formatNumber(stamps.length), `1인당 평균 ${avgStamps.toFixed(1)}개`);
    setKpi("kpi-vouchers", formatNumber(vouchers.length), `발급액 ${formatWon(voucherAmount)}`);
    setKpi(
      "kpi-used-coupons",
      formatNumber(usedCoupons.length),
      `사용 유저 ${formatNumber(usedUsers.size)}명`
    );
    setKpi(
      "kpi-conversion",
      formatPercent(converted, voucherUsers.size),
      `교환권 유저 ${formatNumber(voucherUsers.size)} → 사용 ${formatNumber(converted)}`
    );
    setKpi(
      "kpi-coupon-amount",
      formatWon(usedAmount),
    );
    setKpi(
      "kpi-tests",
      formatNumber(tests.length),
      `유형 ${fieldCounter(tests, "테스트 결과").length}종`
    );
    setKpi(
      "kpi-messages",
      formatNumber(messages.length),
      `대상 ${fieldCounter(messages, "응원 타겟").length}곳`
    );

    // ---- 시간별 가입/스탬프 ----
    const hourlyUsers = buildHourCounts(users, "가입일", 8, 23);
    const hourlyStamps = buildHourCounts(stamps, "발급일시", 8, 23);
    const hourLabels = hourlyUsers.labels;

    const hourlyChart = new Chart(document.getElementById("chart-hourly"), {
      type: "bar",
      data: {
        labels: hourLabels,
        datasets: [
          {
            label: "가입",
            data: hourlyUsers.values,
            backgroundColor: COLORS.signup,
            borderRadius: 8,
            maxBarThickness: 34,
            hidden: false,
          },
          {
            label: "스탬프",
            data: hourlyStamps.values,
            backgroundColor: COLORS.stamp,
            borderRadius: 8,
            maxBarThickness: 34,
            hidden: false,
          },
        ],
      },
      options: {
        ...baseOptions({ legend: true }),
        plugins: {
          ...baseOptions({ legend: true }).plugins,
          datalabels: {
            ...baseOptions().plugins.datalabels,
            font: { weight: "700", size: 11 },
            formatter: (value) => (value ? formatNumber(value) : ""),
          },
        },
      },
      plugins: [whiteBgPlugin],
    });

    bindToggleGroup("hourly", (mode) => {
      hourlyChart.data.datasets[0].hidden = mode === "stamps";
      hourlyChart.data.datasets[1].hidden = mode === "users";
      hourlyChart.update();
    });

    // ---- 일별 교환권/쿠폰 ----
    const dailyVoucher = buildDailySeries(vouchers, "발급일시");
    const dailyCoupon = buildDailySeries(usedCoupons, "사용일시");
    const dayLabels = [...new Set([...dailyVoucher.labels, ...dailyCoupon.labels])].sort();
    const voucherDayMap = Object.fromEntries(
      dailyVoucher.labels.map((label, i) => [label, dailyVoucher.values[i]])
    );
    const couponDayMap = Object.fromEntries(
      dailyCoupon.labels.map((label, i) => [label, dailyCoupon.values[i]])
    );

    const dailyChart = new Chart(document.getElementById("chart-daily"), {
      type: "line",
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: "교환권 발급",
            data: dayLabels.map((d) => voucherDayMap[d] || 0),
            borderColor: COLORS.voucher,
            backgroundColor: COLORS.voucher,
            borderWidth: 3,
            tension: 0.25,
            pointRadius: 5,
            pointHoverRadius: 6,
            pointBackgroundColor: COLORS.voucher,
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            hidden: false,
          },
          {
            label: "쿠폰 사용",
            data: dayLabels.map((d) => couponDayMap[d] || 0),
            borderColor: COLORS.coupon,
            backgroundColor: COLORS.coupon,
            borderWidth: 3,
            tension: 0.25,
            pointRadius: 5,
            pointHoverRadius: 6,
            pointBackgroundColor: COLORS.coupon,
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            hidden: false,
          },
        ],
      },
      options: {
        ...baseOptions({ legend: true }),
        plugins: {
          ...baseOptions({ legend: true }).plugins,
          datalabels: {
            ...baseOptions().plugins.datalabels,
            anchor: "end",
            align: "top",
            offset: 6,
            formatter: (value) => (value ? formatNumber(value) : ""),
          },
        },
      },
      plugins: [whiteBgPlugin],
    });

    bindToggleGroup("daily", (mode) => {
      dailyChart.data.datasets[0].hidden = mode === "coupons";
      dailyChart.data.datasets[1].hidden = mode === "vouchers";
      dailyChart.update();
    });

    // ---- 쿠폰 사용 인구통계 ----
    const demoGender = buildCouponDemo(users, usedCoupons, "성별", ["여성", "남성"]);
    const demoAge = buildCouponDemo(users, usedCoupons, "연령대", AGE_ORDER);
    const demoJob = topN(buildCouponDemo(users, usedCoupons, "직업"), 6);
    const demoRegion = buildCouponDemo(users, usedCoupons, "거주지");

    makeBar(
      "chart-coupon-gender",
      demoGender.map((d) => d.key),
      demoGender.map((d) => d.uses),
      {
        colors: demoGender.map((d) => (d.key === "여성" ? COLORS.female : COLORS.male)),
        label: "사용 건수",
      }
    );
    makeBar(
      "chart-coupon-age",
      demoAge.map((d) => d.key),
      demoAge.map((d) => d.uses),
      { label: "사용 건수" }
    );
    makeBar(
      "chart-coupon-job",
      demoJob.map((d) => d.key),
      demoJob.map((d) => d.uses),
      { horizontal: true, label: "사용 건수" }
    );
    makeBar(
      "chart-coupon-region",
      demoRegion.map((d) => d.key),
      demoRegion.map((d) => d.uses),
      { label: "사용 건수" }
    );

    const jobOrder = topN(buildCouponDemo(users, usedCoupons, "직업"), 6).map((d) => d.key);
    const genderOrder = ["여성", "남성"];
    renderMatrixTable(
      "table-gender-age",
      buildCrossCounts(users, usedCoupons, "성별", "연령대"),
      genderOrder,
      AGE_ORDER
    );
    renderMatrixTable(
      "table-age-job",
      buildCrossCounts(users, usedCoupons, "연령대", "직업"),
      AGE_ORDER,
      jobOrder
    );
    renderMatrixTable(
      "table-gender-job",
      buildCrossCounts(users, usedCoupons, "성별", "직업"),
      genderOrder,
      jobOrder
    );

    // ---- 성별 × 연령대 ----
    const female = Object.fromEntries(AGE_ORDER.map((age) => [age, 0]));
    const male = Object.fromEntries(AGE_ORDER.map((age) => [age, 0]));
    for (const user of users) {
      const age = user["연령대"];
      if (!AGE_ORDER.includes(age)) continue;
      if (user["성별"] === "여성") female[age] += 1;
      else if (user["성별"] === "남성") male[age] += 1;
    }

    new Chart(document.getElementById("chart-gender-age"), {
      type: "bar",
      data: {
        labels: AGE_ORDER,
        datasets: [
          {
            label: "여성",
            data: AGE_ORDER.map((age) => female[age]),
            backgroundColor: COLORS.female,
            borderRadius: 8,
          },
          {
            label: "남성",
            data: AGE_ORDER.map((age) => male[age]),
            backgroundColor: COLORS.male,
            borderRadius: 8,
          },
        ],
      },
      options: baseOptions({ legend: true }),
      plugins: [whiteBgPlugin],
    });

    const channel = topN(fieldCounter(users, "알게된 경로"), 8);
    makeBar(
      "chart-channel",
      channel.map(([k]) => k),
      channel.map(([, v]) => v),
      { horizontal: true }
    );

    const jobs = topN(fieldCounter(users, "직업"), 8);
    makeBar(
      "chart-job",
      jobs.map(([k]) => k),
      jobs.map(([, v]) => v),
      { horizontal: true }
    );

    const region = fieldCounter(users, "거주지");
    const regionColors = region.map((_, i) => PALETTE[i % PALETTE.length]);
    makeDoughnutSimple(
      "chart-region",
      region.map(([k]) => k),
      region.map(([, v]) => v),
      regionColors
    );
    renderStatList(
      "region-legend",
      region.map(([k]) => k),
      region.map(([, v]) => v),
      regionColors
    );

    const testResult = fieldCounter(tests, "테스트 결과");
    const testColors = testResult.map((_, i) => PALETTE[i % PALETTE.length]);
    makeDoughnutSimple(
      "chart-test",
      testResult.map(([k]) => k),
      testResult.map(([, v]) => v),
      testColors
    );
    renderStatList(
      "test-legend",
      testResult.map(([k]) => k),
      testResult.map(([, v]) => v),
      testColors
    );

    const voucherAmountBuckets = fieldCounter(vouchers, "금액");
    const usedAmountBuckets = fieldCounter(usedCoupons, "쿠폰 금액");
    const amountLabels = [
      ...new Set([
        ...voucherAmountBuckets.map(([k]) => k),
        ...usedAmountBuckets.map(([k]) => k),
      ]),
    ].sort((a, b) => Number(a) - Number(b));
    const voucherAmtMap = Object.fromEntries(voucherAmountBuckets);
    const usedAmtMap = Object.fromEntries(usedAmountBuckets);

    new Chart(document.getElementById("chart-coupon-amount"), {
      type: "bar",
      data: {
        labels: amountLabels.map((v) => `${formatNumber(v)}원`),
        datasets: [
          {
            label: "교환권 발급",
            data: amountLabels.map((k) => voucherAmtMap[k] || 0),
            backgroundColor: COLORS.voucher,
            borderRadius: 8,
          },
          {
            label: "실제 사용",
            data: amountLabels.map((k) => usedAmtMap[k] || 0),
            backgroundColor: COLORS.coupon,
            borderRadius: 8,
          },
        ],
      },
      options: baseOptions({ legend: true }),
      plugins: [whiteBgPlugin],
    });

    const stampPlaces = topN(fieldCounter(stamps, "발급장소명"), 10);
    makeBar(
      "chart-stamp-places",
      stampPlaces.map(([k]) => k),
      stampPlaces.map(([, v]) => v),
      { horizontal: true }
    );

    const supportTargets = topN(fieldCounter(messages, "응원 타겟"), 10);
    makeBar(
      "chart-support",
      supportTargets.map(([k]) => k),
      supportTargets.map(([, v]) => v),
      {
        horizontal: true,
        colors: supportTargets.map((_, i) => PALETTE[(i + 3) % PALETTE.length]),
      }
    );

    const stampRank = fieldCounter(stamps, "발급장소명").map(([name, count]) => ({
      name,
      count,
      share: formatPercent(count, stamps.length),
    }));
    makeBar(
      "chart-stamp-rank",
      stampRank.slice(0, 12).map((d) => d.name),
      stampRank.slice(0, 12).map((d) => d.count),
      { horizontal: true, colors: stampRank.slice(0, 12).map((_, i) => PALETTE[i % PALETTE.length]) }
    );
    renderRankList("rank-stamp-places", stampRank, { variant: "stamp" });

    const shopRank = shopStats(usedCoupons).map(([name, count, amount]) => ({
      name,
      count,
      amount,
      share: formatPercent(count, usedCoupons.length),
    }));
    makeBar(
      "chart-shop-rank",
      shopRank.slice(0, 12).map((d) => d.name),
      shopRank.slice(0, 12).map((d) => d.count),
      {
        horizontal: true,
        colors: shopRank.slice(0, 12).map(() => COLORS.coupon),
      }
    );
    renderRankList("rank-coupon-shops", shopRank, { variant: "coupon", showAmount: true });

    const voucherRank = voucherReasonStats(vouchers).map(([name, count, amount]) => ({
      name,
      count,
      amount,
      share: formatPercent(count, vouchers.length),
    }));
    makeBar(
      "chart-voucher-rank",
      voucherRank.map((d) => d.name),
      voucherRank.map((d) => d.count),
      {
        horizontal: true,
        colors: voucherRank.map(() => COLORS.voucher),
      }
    );
    renderRankList("rank-voucher-reasons", voucherRank, {
      variant: "voucher",
      showAmount: true,
    });

    setupCardExports();
    statusEl.textContent = `로드 완료 · ${new Date().toLocaleString("ko-KR")}`;
  } catch (error) {
    console.error(error);
    statusEl.textContent =
      "데이터 로드 실패. 로컬 서버로 열어주세요. (예: python3 -m http.server 5173)";
  }
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

  const scrollables = [...card.querySelectorAll(".rank-list, .matrix-wrap")];
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

function setupCardExports() {
  const cards = [
    ...document.querySelectorAll(".chart-grid > article"),
    ...document.querySelectorAll("main > .table-section"),
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

main();
