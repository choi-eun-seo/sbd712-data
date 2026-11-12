import {
  AGE_ORDER,
  loadJson,
  parseDate,
  formatNumber,
  formatPercent,
  fieldCounter,
  topN,
  setKpi,
  makeBar,
  blankLabel,
  setupCardExports,
  markActiveNav,
  PALETTE,
} from "./common.js";

Chart.register(ChartDataLabels);

const PAGE_SIZE = 20;
const statusEl = document.getElementById("load-status");

let allMessages = [];
let filtered = [];
let page = 1;

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return blankLabel(value);
  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderList() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (page > totalPages) page = totalPages;
  const start = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById("list-status").textContent =
    `표시 ${formatNumber(filtered.length)}건 · ${page}/${totalPages} 페이지`;
  document.getElementById("page-info").textContent = `${page} / ${totalPages}`;
  document.getElementById("page-prev").disabled = page <= 1;
  document.getElementById("page-next").disabled = page >= totalPages;

  document.getElementById("message-list").innerHTML = rows
    .map(
      (row) => `<article class="message-card">
        <div class="message-top">
          <strong>${blankLabel(row["응원 타겟"])}</strong>
          <span>${formatDateTime(row["작성일"])}</span>
        </div>
        <p>${blankLabel(row["응원메세지"])}</p>
        <div class="message-meta">
          ${row.gender ? `<span>${row.gender}</span>` : ""}
          ${row.age ? `<span>${row.age}</span>` : ""}
        </div>
      </article>`
    )
    .join("") || `<p class="empty-note">조건에 맞는 메시지가 없습니다.</p>`;
}

function applyFilter() {
  const target = document.getElementById("filter-target").value;
  const q = document.getElementById("filter-search").value.trim().toLowerCase();
  filtered = allMessages.filter((row) => {
    if (target && row["응원 타겟"] !== target) return false;
    if (!q) return true;
    return String(row["응원메세지"] || "").toLowerCase().includes(q);
  });
  page = 1;
  renderList();
}

async function main() {
  markActiveNav();
  try {
    const [messages, users] = await Promise.all([
      loadJson("./data/supportMessage.json"),
      loadJson("./data/user.json"),
    ]);

    const userMap = new Map(users.map((u) => [u["사용자 식별자"], u]));
    allMessages = messages
      .map((row) => {
        const user = userMap.get(row["사용자 식별자"]);
        return {
          ...row,
          gender: user?.["성별"] || "",
          age: user?.["연령대"] || "",
        };
      })
      .sort((a, b) => {
        const da = parseDate(a["작성일"])?.getTime() || 0;
        const db = parseDate(b["작성일"])?.getTime() || 0;
        return db - da;
      });

    const targets = fieldCounter(allMessages, "응원 타겟");
    const writers = new Set(allMessages.map((m) => m["사용자 식별자"]).filter(Boolean));
    const avgLen =
      allMessages.reduce((sum, m) => sum + String(m["응원메세지"] || "").length, 0) /
      (allMessages.length || 1);

    setKpi("kpi-messages", formatNumber(allMessages.length), "전체 응원 메시지");
    setKpi("kpi-targets", formatNumber(targets.length), `1위 ${targets[0]?.[0] || "-"}`);
    setKpi("kpi-writers", formatNumber(writers.size), "메시지를 남긴 유저");
    setKpi("kpi-avg-len", `${avgLen.toFixed(1)}자`, "메시지 평균 길이");

    const topTargets = topN(targets, 12);
    makeBar(
      "chart-targets",
      topTargets.map(([k]) => k),
      topTargets.map(([, v]) => v),
      { horizontal: true }
    );

    const withUser = allMessages.filter((m) => m.gender || m.age);
    const gender = fieldCounter(withUser, "gender");
    makeBar(
      "chart-writer-gender",
      gender.map(([k]) => k),
      gender.map(([, v]) => v),
      {
        colors: gender.map(([k]) => (k === "여성" ? "#e11d48" : k === "남성" ? "#2563eb" : PALETTE[0])),
      }
    );

    const ageMap = new Map(fieldCounter(withUser, "age"));
    const ageLabels = AGE_ORDER.filter((k) => ageMap.has(k));
    makeBar(
      "chart-writer-age",
      ageLabels,
      ageLabels.map((k) => ageMap.get(k) || 0)
    );

    const select = document.getElementById("filter-target");
    select.innerHTML =
      `<option value="">전체</option>` +
      targets.map(([name, count]) => `<option value="${name}">${name} (${count})</option>`).join("");

    select.addEventListener("change", applyFilter);
    document.getElementById("filter-search").addEventListener("input", applyFilter);
    document.getElementById("page-prev").addEventListener("click", () => {
      page -= 1;
      renderList();
    });
    document.getElementById("page-next").addEventListener("click", () => {
      page += 1;
      renderList();
    });

    filtered = allMessages;
    renderList();
    setupCardExports();
    statusEl.textContent = `로드 완료 · ${new Date().toLocaleString("ko-KR")}`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "데이터 로드 실패. 로컬 서버 또는 GitHub Pages로 열어주세요.";
  }
}

main();
