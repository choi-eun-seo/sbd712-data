import {
  AGE_ORDER,
  PALETTE,
  loadJson,
  parseDate,
  formatNumber,
  formatPercent,
  fieldCounter,
  setKpi,
  makeBar,
  makeDoughnutSimple,
  renderStatList,
  blankLabel,
  renderMatrixTable,
  setupCardExports,
  markActiveNav,
} from "./common.js";

Chart.register(ChartDataLabels);

const PAGE_SIZE = 20;
const statusEl = document.getElementById("load-status");

let allTests = [];
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

  document.getElementById("test-list").innerHTML = rows
    .map(
      (row) => `<article class="message-card">
        <div class="message-top">
          <strong>${blankLabel(row["테스트 결과"])}</strong>
          <span>${formatDateTime(row["테스트일시"])}</span>
        </div>
        <div class="message-meta">
          ${row.gender ? `<span>${row.gender}</span>` : ""}
          ${row.age ? `<span>${row.age}</span>` : ""}
          ${row.job ? `<span>${row.job}</span>` : ""}
          ${row.region ? `<span>${row.region}</span>` : ""}
        </div>
      </article>`
    )
    .join("") || `<p class="empty-note">조건에 맞는 결과가 없습니다.</p>`;
}

function applyFilter() {
  const result = document.getElementById("filter-result").value;
  const q = document.getElementById("filter-search").value.trim().toLowerCase();
  filtered = allTests.filter((row) => {
    if (result && row["테스트 결과"] !== result) return false;
    if (!q) return true;
    return String(row["테스트 결과"] || "").toLowerCase().includes(q);
  });
  page = 1;
  renderList();
}

async function main() {
  markActiveNav();
  try {
    const [tests, users] = await Promise.all([
      loadJson("./data/test.json"),
      loadJson("./data/user.json"),
    ]);

    const userMap = new Map(users.map((u) => [u["사용자 식별자"], u]));
    allTests = tests
      .map((row) => {
        const user = userMap.get(row["사용자 식별자"]);
        return {
          ...row,
          gender: user?.["성별"] || "",
          age: user?.["연령대"] || "",
          job: user?.["직업"] || "",
          region: user?.["거주지"] || "",
        };
      })
      .sort((a, b) => {
        const da = parseDate(a["테스트일시"])?.getTime() || 0;
        const db = parseDate(b["테스트일시"])?.getTime() || 0;
        return db - da;
      });

    const results = fieldCounter(allTests, "테스트 결과");
    const uniqueUsers = new Set(allTests.map((t) => t["사용자 식별자"]).filter(Boolean));
    const top = results[0];

    setKpi("kpi-tests", formatNumber(allTests.length), "전체 응답");
    setKpi("kpi-types", formatNumber(results.length), "결과 유형 수");
    setKpi(
      "kpi-top",
      top?.[0] || "-",
      top ? `${formatNumber(top[1])}건 · ${formatPercent(top[1], allTests.length)}` : ""
    );
    setKpi("kpi-users", formatNumber(uniqueUsers.size), "테스트 참여 유저");

    const colors = results.map((_, i) => PALETTE[i % PALETTE.length]);
    makeDoughnutSimple(
      "chart-test",
      results.map(([k]) => k),
      results.map(([, v]) => v),
      colors
    );
    renderStatList(
      "test-legend",
      results.map(([k]) => k),
      results.map(([, v]) => v),
      colors
    );
    makeBar(
      "chart-test-bar",
      results.map(([k]) => k),
      results.map(([, v]) => v),
      { horizontal: true, colors }
    );

    const withUser = allTests.filter((t) => t.gender || t.age);
    const gender = fieldCounter(withUser, "gender");
    makeBar(
      "chart-test-gender",
      gender.map(([k]) => k),
      gender.map(([, v]) => v),
      {
        colors: gender.map(([k]) => (k === "여성" ? "#e11d48" : k === "남성" ? "#2563eb" : PALETTE[0])),
      }
    );

    const ageMap = new Map(fieldCounter(withUser, "age"));
    const ageLabels = AGE_ORDER.filter((k) => ageMap.has(k));
    makeBar(
      "chart-test-age",
      ageLabels,
      ageLabels.map((k) => ageMap.get(k) || 0)
    );

    const resultOrder = results.map(([k]) => k);
    // result is on the test row itself, not user - build custom matrix
    const resultGender = new Map();
    const resultAge = new Map();
    for (const row of allTests) {
      const result = blankLabel(row["테스트 결과"]);
      const g = blankLabel(row.gender || "(미연결)");
      const a = blankLabel(row.age || "(미연결)");
      if (!resultGender.has(result)) resultGender.set(result, new Map());
      if (!resultAge.has(result)) resultAge.set(result, new Map());
      resultGender.get(result).set(g, (resultGender.get(result).get(g) || 0) + 1);
      resultAge.get(result).set(a, (resultAge.get(result).get(a) || 0) + 1);
    }

    const genderCols = ["여성", "남성", "(미연결)"].filter((k) =>
      [...resultGender.values()].some((m) => m.has(k))
    );
    const ageCols = [...AGE_ORDER, "(미연결)"].filter((k) =>
      [...resultAge.values()].some((m) => m.has(k))
    );

    renderMatrixTable("table-result-gender", resultGender, resultOrder, genderCols);
    renderMatrixTable("table-result-age", resultAge, resultOrder, ageCols);

    const select = document.getElementById("filter-result");
    select.innerHTML =
      `<option value="">전체</option>` +
      results
        .map(([name, count]) => `<option value="${name}">${name} (${count})</option>`)
        .join("");

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

    filtered = allTests;
    renderList();
    setupCardExports();
    statusEl.textContent = `로드 완료 · ${new Date().toLocaleString("ko-KR")}`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "데이터 로드 실패. 로컬 서버 또는 GitHub Pages로 열어주세요.";
  }
}

main();
