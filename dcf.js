const API = "https://mahathir-finance-github-io.onrender.com";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clearCache() {
  for (let key in CACHE) delete CACHE[key];
}



let controller;

function resetController() {
  if (controller) controller.abort();
  controller = new AbortController();
}


const CACHE = {};

async function cachedFetch(url, options, key) {

  if (CACHE[key]) return CACHE[key];

  const promise = fetchWithRetry(url, options);

  CACHE[key] = promise;

  try {
    const data = await promise;
    CACHE[key] = data;
    return data;
  } catch (err) {
    delete CACHE[key]; // ✅ GOOD (you already did this)
    throw err;
  }
}


async function fetchWithRetry(url, options, retries = 2, delay = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller ? controller.signal : undefined
      });

      // 🚨 RATE LIMIT HANDLING
      if (res.status === 429) {
        const wait = delay * (i + 2);
        console.warn(`⏳ Rate limited. Waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }

      // ❌ HARD FAIL (don't retry)
      if (res.status >= 400 && res.status < 500) {
        const text = await res.text();
        throw new Error(`Client Error ${res.status}: ${text}`);
      }

      // ❌ SERVER FAIL (retry)
      if (!res.ok) {
        throw new Error(`Server Error ${res.status}`);
      }

      return await res.json();

    } catch (err) {

      // 🚫 DO NOT retry cancelled requests
      if (err.name === "AbortError") {
        console.warn("Request cancelled");
        throw err;
      }

      if (i === retries) {
        console.error("❌ Final failure:", err);
        throw err;
      }

      const wait = delay * (i + 1);
      console.warn(`Retrying in ${wait}ms...`);
      await sleep(wait);
    }
  }
}
// ======================
// Global state
// ======================
var GLOBAL_WACC = 0;
var GLOBAL_FCF = [];
var GLOBAL_REVENUE = [];
var GLOBAL_G = 0.03;

var GLOBAL_BETA = 1;
var GLOBAL_RF = 0.0445;
var GLOBAL_MRP = 0.055;
var GLOBAL_TAX = 0.15;

var GLOBAL_PRICE = null;
var GLOBAL_SHARES = 14681;
var GLOBAL_NET_DEBT = 0;

var GLOBAL_FUNDAMENTALS = null;

var GLOBAL_VALUATIONS = {
  dcf: { low: 0, base: 0, high: 0 },
  apv: { low: 0, base: 0, high: 0 },
  comps: { low: 0, base: 0, high: 0 }
};

var chart;

/**
 * Chart colors: light mode uses black grids/ticks and saturated series colors;
 * dark mode keeps light grids on black.
 */
function getChartThemeColors() {
  const light = document.documentElement.getAttribute("data-theme") === "light";
  if (light) {
    return {
      grid: "rgba(0, 0, 0, 0.32)",
      tick: "#111111",
      legend: "#111111",
      seriesPrimary: "#0b5ed7",
      seriesSecondary: "#c2410c",
      scatter: "#0b5ed7",
      regressionLine: "#0a0a0a",
      footballBars: ["#198754", "#e07700", "#0b5ed7"],
      footballMidpoint: "#0a0a0a",
      footballMarket: "#c82333"
    };
  }
  return {
    grid: "rgba(255, 255, 255, 0.16)",
    tick: "rgba(255, 255, 255, 0.78)",
    legend: "rgba(255, 255, 255, 0.78)",
    seriesPrimary: "#ffffff",
    seriesSecondary: "rgba(255, 255, 255, 0.65)",
    scatter: "rgba(255, 255, 255, 0.72)",
    regressionLine: "#ffffff",
    footballBars: [
      "rgba(76, 175, 80, 0.88)",
      "rgba(255, 152, 0, 0.88)",
      "rgba(33, 150, 243, 0.88)"
    ],
    footballMidpoint: "rgba(255, 255, 255, 0.9)",
    footballMarket: "rgba(244, 67, 54, 0.95)"
  };
}

function dcfTableOpen() {
  return (
    '<div class="table-responsive mb-3 border rounded overflow-hidden dcf-bootstrap-table-wrap">' +
    '<table class="table table-sm table-striped table-hover table-bordered align-middle mb-0">'
  );
}

function dcfTableClose() {
  return "</table></div>";
}

var __dcfGenerating = false;
function dcfWithTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error((label || "Operation") + " timed out after " + ms + "ms"));
      }, ms);
    })
  ]);
}

function dcfSetProgressRunning(isRunning) {
  const bar = document.getElementById("dcfProgressBar");
  if (!bar) return;
  bar.classList.toggle("progress-bar-animated", !!isRunning);
  bar.classList.toggle("progress-bar-striped", !!isRunning);
}

var DCF_PIPELINE_STEPS = [
  { id: "beta", label: "Equity beta regression" },
  { id: "peerBeta", label: "Peer beta" },
  { id: "fullModel", label: "Full model (revenue → FCF)" },
  { id: "wacc", label: "WACC" },
  { id: "comps", label: "Comps / forecast" },
  { id: "dcf", label: "Run DCF" },
  { id: "apv", label: "Run APV" },
  { id: "stockPrice", label: "Stock price" },
  { id: "football", label: "Football field chart" },
  { id: "stockChart", label: "Stock vs intrinsic chart" },
  { id: "summary", label: "Valuation summary" }
];

function dcfShowSkeletons() {
  document.querySelectorAll(".dcf-result-panel .dcf-skeleton").forEach(function (el) {
    el.hidden = false;
  });
  document.querySelectorAll(".dcf-result-panel .dcf-panel-real").forEach(function (el) {
    el.hidden = true;
  });
}

function dcfResizeCharts() {
  requestAnimationFrame(function () {
    try {
      if (typeof chart !== "undefined" && chart && typeof chart.resize === "function") {
        chart.resize();
      }
      if (typeof stockChart !== "undefined" && stockChart && typeof stockChart.resize === "function") {
        stockChart.resize();
      }
      if (window.footballChart && typeof window.footballChart.resize === "function") {
        window.footballChart.resize();
      }
      if (window.betaChart && typeof window.betaChart.resize === "function") {
        window.betaChart.resize();
      }
    } catch (_) {}
  });
}

function dcfRevealPanels() {
  document.querySelectorAll(".dcf-result-panel .dcf-skeleton").forEach(function (el) {
    el.hidden = true;
  });
  document.querySelectorAll(".dcf-result-panel .dcf-panel-real").forEach(function (el) {
    el.hidden = false;
  });
  dcfResizeCharts();
}

function dcfResetPipelineList() {
  const ul = document.getElementById("dcfPipelineSteps");
  if (!ul) return;
  ul.innerHTML = DCF_PIPELINE_STEPS.map(function (s) {
    return (
      "<li class=\"dcf-step dcf-step--pending\" data-step=\"" + s.id + "\">" +
      "<span class=\"dcf-step-icon\" aria-hidden=\"true\"></span>" +
      "<span class=\"dcf-step-label\">" + s.label + "</span>" +
      "<span class=\"dcf-step-detail\"></span>" +
      "</li>"
    );
  }).join("");
}

function dcfSetPipelineProgress(completed, total) {
  const pct = Math.min(100, Math.round((completed / total) * 100));
  const bar = document.getElementById("dcfProgressBar");
  const wrap = document.getElementById("dcfProgressWrap");
  if (bar) bar.style.width = pct + "%";
  if (wrap) wrap.setAttribute("aria-valuenow", String(pct));
}

async function dcfRunPipelineStep(id, fn) {
  const li = document.querySelector(`#dcfPipelineSteps [data-step="${id}"]`);

  if (li) {
    // ✅ RESET STATE PROPERLY
    li.classList.remove("dcf-step--ok", "dcf-step--fail");
    li.classList.add("dcf-step--running");

    const det = li.querySelector(".dcf-step-detail");
    if (det) det.textContent = "Running...";
  }

  try {
    await dcfWithTimeout(Promise.resolve().then(fn), 15000, "Step " + id);

    if (li) {
      // ✅ CLEAN TRANSITION TO SUCCESS
      li.classList.remove("dcf-step--running");
      li.classList.add("dcf-step--ok");

      const det = li.querySelector(".dcf-step-detail");
      if (det) det.textContent = "Done";
    }

    return true;

  } catch (err) {
    const msg = err && err.message ? err.message : String(err);

    if (li) {
      // ❌ ERROR STATE
      li.classList.remove("dcf-step--running");
      li.classList.add("dcf-step--fail");

      const det = li.querySelector(".dcf-step-detail");
      if (det) det.textContent = msg;
    }

    return false;
  }
}

/** If custom WACC % is set, overrides GLOBAL_WACC (decimal). Call after loadWACC. */
function applyCustomWacc() {
  const el = document.getElementById("customWacc");
  if (!el) return;
  const raw = String(el.value || "").replace(/,/g, "").trim();
  if (!raw) return;
  const v = parseFloat(raw);
  if (!isNaN(v) && v > 0) {
    GLOBAL_WACC = v / 100;
  }
}

// ======================
// RUN DCF
// ======================
// ======================
// RUN DCF (WACC-INTEGRATED)
// ======================
async function runDCF() {

  if (!__dcfGenerating) {
    dcfRevealPanels();
  }

  applyCustomWacc();

  let revenue = parseFloat(document.getElementById("revenue")?.value) || 1000;
  const growth = (parseFloat(document.getElementById("growth")?.value) || 5) / 100;
  const margin = (parseFloat(document.getElementById("margin")?.value) || 20) / 100;
  const tax = (parseFloat(document.getElementById("tax")?.value) || 25) / 100;
  const capex = (parseFloat(document.getElementById("capex")?.value) || 5) / 100;

  let fcf = GLOBAL_FCF;

  if (!fcf || fcf.length === 0) {
    document.getElementById("result").innerText =
      "Run Generate model first to build FCF from the full model.";
    throw new Error("No FCF series (run full model first).");
  }

  GLOBAL_FCF = fcf;
  GLOBAL_G = 0.03;

  const shares = GLOBAL_SHARES || 14681;
  const netDebt = GLOBAL_NET_DEBT || 0;

  const discountRate = (typeof GLOBAL_WACC === "number" && GLOBAL_WACC > 0)
    ? GLOBAL_WACC
    : 0.10;

  try {

 const raw = await cachedFetch(
  `${API}/dcf`,
  {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      fcf,
      discount_rate: discountRate,
      terminal_growth: GLOBAL_G
    })
  },
  `dcf-${discountRate}-${GLOBAL_G}-${fcf[0]}`
);

// const raw = await res.json();

    if (raw.error) {
      resultEl.innerHTML = "Error: " + raw.error;
      throw new Error(raw.error);
    }

    const data = (raw.growth && typeof raw.growth === "object")
      ? raw.growth
      : raw;

    if (data.error) {
      resultEl.innerHTML = "Error: " + data.error;
      throw new Error(data.error);
    }

    const enterpriseValue = data.enterprise_value ?? 0;

    const equityValue = enterpriseValue - netDebt;
    const pricePerShare = equityValue / shares;

    const method =
      document.querySelector('input[name="valuationMethod"]:checked')?.value || "wacc";
    const methodNote =
      method === "apv"
        ? " APV per share is in the APV section below."
        : "";

    const resultEl = document.getElementById("dcfResult");

const summaryTable = (
  dcfTableOpen() +
  `<thead>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Enterprise Value</td>
      <td>$${Math.round(enterpriseValue).toLocaleString()}M</td>
    </tr>
    <tr>
      <td>Net Debt</td>
      <td>$${Math.round(netDebt).toLocaleString()}M</td>
    </tr>
    <tr>
      <td><strong>Equity Value</strong></td>
      <td><strong>$${Math.round(equityValue).toLocaleString()}M</strong></td>
    </tr>
    <tr>
      <td>Shares Outstanding</td>
      <td>${Math.round(shares).toLocaleString()}M</td>
    </tr>
    <tr>
      <td><strong>Intrinsic Value / Share</strong></td>
      <td><strong>$${pricePerShare.toFixed(2)}</strong></td>
    </tr>
  </tbody>` +
  dcfTableClose()
);

const assumptionsBlock = `
  <div class="text-block-muted mt-3">
    <strong>Key Assumptions</strong><br>
    Discount rate (WACC): ${(discountRate * 100).toFixed(2)}%<br>
    Terminal growth: ${(GLOBAL_G * 100).toFixed(2)}%<br>
    Forecast periods: ${fcf.length} years<br>
    Method: ${method.toUpperCase()}
  </div>
`;

const breakdown = `
<div class="text-block-muted mt-3">
  <strong>Valuation logic</strong><br>
  Enterprise Value = PV(FCF) + Terminal Value<br>
  Equity Value = EV − Net Debt<br>
  Price per Share = Equity / Shares
</div>
`;

resultEl.innerHTML =
  `<h5 style="margin-bottom:10px;">DCF Valuation</h5>` +
  summaryTable +
  assumptionsBlock +
  breakdown;

    // Store for football-field chart
    GLOBAL_VALUATIONS.dcf = {
      low: pricePerShare * 0.85,
      base: pricePerShare,
      high: pricePerShare * 1.15
    };

    renderChart(fcf);

    if (GLOBAL_REVENUE?.length > 0) {
      renderForecastTable(GLOBAL_REVENUE, margin, tax, capex);
    }

    setTimeout(() => {
  buildSensitivityTable(fcf);
}, 0);

  } catch (err) {
    console.error(err);
    resultEl.innerHTML = "Error running DCF";
    if (__dcfGenerating) throw err;
  }
}

// ======================
// CHART
// ======================
function renderChart(fcf) {

  const ctx = document.getElementById("dcfChart").getContext("2d");

  if (chart) chart.destroy();

  const { grid, tick, legend, seriesPrimary } = getChartThemeColors();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Y1","Y2","Y3","Y4","Y5"],
      datasets: [{
        label: "Free cash flow",
        data: fcf,
        borderColor: seriesPrimary,
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: legend, font: { weight: "600" } }
        }
      },
      scales: {
        x: {
          ticks: { color: tick },
          grid: { color: grid, drawBorder: false }
        },
        y: {
          ticks: {
            color: tick,
            callback: v => "$" + Number(v).toLocaleString()
          },
          grid: { color: grid, drawBorder: false }
        }
      }
    }
  });
}

// ======================
// REVENUE FORECAST TABLE
// ======================
function renderForecastTable(revenues, margin, tax, capex) {

  const table = document.getElementById("forecastTable");
  if (!table) return;

  table.innerHTML = "";

  let years = ["2025","2026","2027","2028","2029"];

  let header = "<thead><tr><th scope=\"col\">Year</th>";
  years.forEach(y => { header += `<th scope="col">${y}</th>`; });
  header += "</tr></thead>";

  let revRow = "<tr><th scope=\"row\">Revenue</th>";
  let ebitRow = "<tr><th scope=\"row\">EBIT</th>";
  let fcfRow = "<tr><th scope=\"row\">FCF</th>";

  for (let r of revenues) {
    const ebit = r * margin;
    const nopat = ebit * (1 - tax);
    const fcf = nopat - (r * capex);

    revRow += `<td>$${Math.round(r).toLocaleString()}</td>`;
    ebitRow += `<td>$${Math.round(ebit).toLocaleString()}</td>`;
    fcfRow += `<td>$${Math.round(fcf).toLocaleString()}</td>`;
  }

  table.innerHTML = header + "<tbody>" + revRow + "</tr>" + ebitRow + "</tr>" + fcfRow + "</tr></tbody>";
}

// ======================
// SENSITIVITY TABLE (BATCHED 🚀)
// ======================
async function buildSensitivityTable(fcf) {

  const table = document.getElementById("sensitivityTable");
  if (!table) return;

  table.innerHTML = "";

  const baseR = GLOBAL_WACC > 0 ? GLOBAL_WACC : 0.1;
  const baseG = GLOBAL_G || 0.03;

  const rValues = [0.09, 0.1, 0.11];
  const gValues = [0.02, 0.03];

  const lightMode = document.documentElement.getAttribute("data-theme") === "light";

  function computeDCF(fcf, r, g) {
    let value = 0;

    for (let i = 0; i < fcf.length; i++) {
      value += fcf[i] / Math.pow(1 + r, i + 1);
    }

    if (r <= g) return 0;

    const terminal =
      (fcf[fcf.length - 1] * (1 + g)) / (r - g);

    value += terminal / Math.pow(1 + r, fcf.length);

    return value;
  }

  try {

    let html = "<thead><tr><th scope=\"col\">g \\ r</th>";

    rValues.forEach(r => {
      html += `<th scope="col">${(r * 100).toFixed(1)}%</th>`;
    });

    html += "</tr></thead><tbody>";

    gValues.forEach((g) => {

      html += `<tr><th scope="row">${(g * 100).toFixed(1)}%</th>`;

      rValues.forEach((r) => {

        // ✅ FIXED LINE
        const value = computeDCF(fcf, r, g);

        let color = lightMode
          ? "rgba(255, 193, 7, 0.42)"
          : "rgba(255, 193, 7, 0.15)";

        if (r < baseR && g > baseG) {
          color = lightMode
            ? "rgba(25, 135, 84, 0.38)"
            : "rgba(25, 135, 84, 0.2)";
        }

        if (r > baseR && g < baseG) {
          color = lightMode
            ? "rgba(220, 53, 69, 0.32)"
            : "rgba(220, 53, 69, 0.15)";
        }

        html += `<td style="background:${color}">$${Math.round(value).toLocaleString()}</td>`;
      });

      html += "</tr>";
    });

    table.innerHTML = html + "</tbody>";

  } catch (err) {
    console.error("Sensitivity table failed:", err);
    table.innerHTML = "<span style='color:#dc3545;'>Failed to load sensitivity</span>";
  }
}

// ======================
// BETA (WITH NERD STATS)
// ======================
async function getBeta(tickerInput) {

  const ticker =
    tickerInput ||
    document.getElementById("ticker")?.value ||
    document.getElementById("mainTicker")?.value ||
    "AAPL";

  const resultEl = document.getElementById("betaResult");
  const detailsEl = document.getElementById("betaDetails");

  resultEl.innerText = "Calculating...";
  detailsEl.innerHTML = "";

  try {
    const data = await cachedFetch(
  `${API}/beta`,
  {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ticker })
  },
  `beta-${ticker}`
);

    if (data.error) {
      resultEl.innerText = "Error: " + data.error;
      throw new Error(data.error);
    }

    if (data.market_returns && data.stock_returns) {
      renderBetaChart(
        data.market_returns,
        data.stock_returns,
        data.beta,
        data.alpha
      );
    }

    resultEl.innerText = "Beta: " + (data.beta ?? 0).toFixed(2);

    detailsEl.innerHTML = `
      <div class="text-block-muted mt-1">
        <strong>Regression output</strong><br>
        Alpha: ${(data.alpha ?? 0).toFixed(4)} · R²: ${(data.r_squared ?? 0).toFixed(3)}<br>
        Std error: ${(data.std_error ?? 0).toFixed(4)} · Observations: ${data.observations ?? 0}
      </div>
    `;

  } catch (err) {
    resultEl.innerText = "Error fetching beta";
    throw err;
  }
}
async function autoForecast(tickerInput, peerTickers = null) {

  const ticker =
    tickerInput ||
    document.getElementById("forecastTicker")?.value ||
    document.getElementById("mainTicker")?.value ||
    "AAPL";

  const resultEl = document.getElementById("forecastResult");
  const detailsEl = document.getElementById("forecastDetails");

  resultEl.innerText = "Calculating...";
  detailsEl.innerHTML = "";

  try {

    // 🚀 PARALLEL FETCH (big performance win)
   const [fundamentalsRes, compsRes, modelRes] = await Promise.all([

  cachedFetch(`${API}/fundamentals`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ticker })
  }, `fundamentals-${ticker}`),

  cachedFetch(`${API}/comps`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      tickers: peerTickers || [ticker]
    })
  }, `comps-${ticker}`),

  cachedFetch(`${API}/full_model`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ticker })
  }, `full_model-${ticker}`)

]);
const fundamentals = fundamentalsRes;
const compsData = compsRes;
const model = modelRes;

    // ❌ Error checks
    if (fundamentals.error) throw new Error(fundamentals.error);
    if (compsData.error) throw new Error(compsData.error);
    if (model.error) throw new Error(model.error);

    // 📊 Global state updates
    GLOBAL_FUNDAMENTALS = fundamentals;
    GLOBAL_SHARES = (fundamentals?.shares || 0) / 1e6;
    GLOBAL_NET_DEBT = ((fundamentals?.debt || 0) - (fundamentals?.cash || 0)) / 1e6;

    const baseMetric = fundamentals?.ebitda
      ? fundamentals.ebitda / 1e6
      : 100;

    const netDebt = (fundamentals.debt && fundamentals.cash)
      ? (fundamentals.debt - fundamentals.cash) / 1e6
      : 0;

    const shares = fundamentals?.shares
      ? fundamentals.shares / 1e6
      : 1000;

    let baseMultiple;

    const userInput = parseFloat(
      document.getElementById("baseMultipleInput")?.value
    );

    if (!isNaN(userInput) && userInput > 0) {
      baseMultiple = userInput;

    } else if (typeof compsData.average_multiple === "number") {
      baseMultiple = compsData.average_multiple;

    } else {
      baseMultiple =
        model.peer_multiple ||
        model.ev_ebitda ||
        (GLOBAL_BETA ? 18 + (GLOBAL_BETA * 4) : 22);
    }

    const lowMultiple = baseMultiple * 0.7;
    const highMultiple = baseMultiple * 1.3;

    // ✅ Set GLOBAL valuations ONCE (correct placement)
    GLOBAL_VALUATIONS.comps = {
      low: (lowMultiple * baseMetric - netDebt) / shares,
      base: (baseMultiple * baseMetric - netDebt) / shares,
      high: (highMultiple * baseMetric - netDebt) / shares
    };

    const source = (!isNaN(userInput) && userInput > 0)
      ? "User Input"
      : (compsData.average_multiple)
        ? "Peer Average"
        : "Model Estimate";

    function buildRow(label, multiple, color) {

      const ev = multiple * baseMetric;
      const equity = ev - netDebt;
      const price = equity / shares;

      return `
        <tr style="background:${color}">
          <th scope="row">${label}</th>
          <td>${multiple.toFixed(2)}x</td>
          <td>$${ev.toLocaleString()}M</td>
          <td>$${equity.toLocaleString()}M</td>
          <td>$${price.toFixed(2)}</td>
        </tr>
      `;
    }

    const table = (
      dcfTableOpen() +
      `<thead><tr>
        <th scope="col">Scenario</th>
        <th scope="col">Multiple</th>
        <th scope="col">EV (mm)</th>
        <th scope="col">Equity value (mm)</th>
        <th scope="col">Price per share ($)</th>
      </tr></thead><tbody>` +
      buildRow("Low (−30%)", lowMultiple, "rgba(220, 53, 69, 0.12)") +
      buildRow("Base (peer avg)", baseMultiple, "rgba(255, 193, 7, 0.12)") +
      buildRow("High (+30%)", highMultiple, "rgba(25, 135, 84, 0.15)") +
      "</tbody>" +
      dcfTableClose()
    );

    const nerd = `
      <div class="text-block-muted mt-3">
        <strong>Inputs (scaled)</strong><br>
        EBITDA (mm): ${baseMetric.toFixed(0)} · 
        Net debt (mm): ${netDebt.toFixed(0)} · 
        Shares (mm): ${shares.toFixed(0)}<br>
        Base multiple: ${baseMultiple.toFixed(2)}x (${source})<br><br>
        <strong>Formula</strong><br>
        EV = multiple × EBITDA; equity = EV − net debt; price = equity / shares
      </div>
    `;

    let peerBreakdown = "";

    if (compsData.peer_multiples) {
      peerBreakdown = "<div class=\"text-block-muted mt-2\"><strong>Peer multiples</strong><br>";

      compsData.peer_multiples.forEach(p => {
        peerBreakdown += `${p.ticker}: ${p.multiple.toFixed(2)}x<br>`;
      });

      peerBreakdown += "</div>";
    }

    resultEl.innerText = "Comps valuation";
    detailsEl.innerHTML = table + nerd + peerBreakdown;

  } catch (err) {

    if (err.name === "AbortError") {
      console.warn("Request cancelled");
      return;
    }

    console.error("AutoForecast failed:", err);

    resultEl.innerText = "Error building valuation";
    detailsEl.innerHTML = `<span style="color:#dc3545;">${err.message}</span>`;

    throw err;
  }
}
// ======================
// FULL MODEL (REVENUE → FCF ENGINE)
// ======================
async function loadFullModel(tickerInput) {

  const ticker =
    tickerInput ||
    document.getElementById("modelTicker")?.value ||
    document.getElementById("mainTicker")?.value ||
    "AAPL";

  const tableEl = document.getElementById("fullModelTable");
  if (!tableEl) throw new Error("Full model table is missing from the page.");

  tableEl.innerHTML = '<p class="text-block-muted mb-0">Loading…</p>';

  try {
    const res = await cachedFetch(`${API}/full_model`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ ticker })
    }, `full_model-${ticker}`);

    const data = res;

    if (data.error) {
      tableEl.innerHTML = "Error: " + data.error;
      throw new Error(data.error);
    }

    const hist = data.historical_revenue || [];
    const forecast = data.forecast_revenue || [];

    if (!hist.length && !forecast.length) {
      tableEl.innerHTML = "No revenue data available";
      throw new Error("No revenue data");
    }

    // =========================
    // ASSUMPTIONS
    // =========================
    const assumptions = {
      cogs_pct: (parseFloat(document.getElementById("cogs_pct")?.value) || 60) / 100,
      sga_pct: (parseFloat(document.getElementById("sga_pct")?.value) || 15) / 100,
      da_pct: (parseFloat(document.getElementById("da_pct")?.value) || 5) / 100,
      tax_rate: (parseFloat(document.getElementById("tax_rate")?.value) || 21) / 100,
      capex_pct: (parseFloat(document.getElementById("capex_pct")?.value) || 6) / 100,
      nwc_pct: (parseFloat(document.getElementById("nwc_pct")?.value) || 2) / 100
    };

    // =========================
    // COMBINE HIST + FORECAST
    // =========================
    const allRevenue = [...hist, ...forecast];

    let rows = {
      revenue: [],
      cogs: [],
      grossProfit: [],
      sga: [],
      ebitda: [],
      da: [],
      ebit: [],
      nopat: [],
      capex: [],
      nwc: [],
      fcf: []
    };

    // =========================
    // BUILD MODEL
    // =========================
    for (let i = 0; i < allRevenue.length; i++) {

      const r = allRevenue[i];
      const isForecast = i >= hist.length;

      // 🔹 Historical → only revenue
      if (!isForecast) {
        rows.revenue.push(r);
        rows.cogs.push(null);
        rows.grossProfit.push(null);
        rows.sga.push(null);
        rows.ebitda.push(null);
        rows.da.push(null);
        rows.ebit.push(null);
        rows.nopat.push(null);
        rows.capex.push(null);
        rows.nwc.push(null);
        rows.fcf.push(null);
        continue;
      }

      // 🔹 Forecast → full model
      const cogs = r * assumptions.cogs_pct;
      const gp = r - cogs;
      const sga = r * assumptions.sga_pct;

      const ebitda = gp - sga;
      const da = r * assumptions.da_pct;
      const ebit = ebitda - da;

      const nopat = ebit * (1 - assumptions.tax_rate);

      const capex = r * assumptions.capex_pct;
      const nwc = r * assumptions.nwc_pct;

      const fcf = nopat + da - capex - nwc;

      rows.revenue.push(r);
      rows.cogs.push(cogs);
      rows.grossProfit.push(gp);
      rows.sga.push(sga);
      rows.ebitda.push(ebitda);
      rows.da.push(da);
      rows.ebit.push(ebit);
      rows.nopat.push(nopat);
      rows.capex.push(capex);
      rows.nwc.push(nwc);
      rows.fcf.push(Number(fcf.toFixed(0)));
    }

    // =========================
    // GLOBAL STORAGE (ONLY FORECAST FCF)
    // =========================
    GLOBAL_FCF = rows.fcf.slice(hist.length);
    GLOBAL_REVENUE = rows.revenue;

    // =========================
    // FORMATTER
    // =========================
    function formatRow(label, arr) {
      return (
        "<tr>" +
        `<th scope="row">${label}</th>` +
        arr.map(v =>
          v === null
            ? `<td>-</td>`
            : `<td>$${Math.round(v).toLocaleString()}</td>`
        ).join("") +
        "</tr>"
      );
    }

    // =========================
    // YEARS HEADER
    // =========================
    const years = [
      ...hist.map((_, i) => `Y-${hist.length - i}`),
      ...forecast.map((_, i) => `F${i + 1}`)
    ];

    // =========================
    // TABLE BUILD
    // =========================
    const table = (
      dcfTableOpen() +
      `<thead>
        <tr>
          <th scope="col">Metric</th>
          ${years.map(y => `<th scope="col">${y}</th>`).join("")}
        </tr>
      </thead>
      <tbody>` +
      formatRow("Revenue", rows.revenue) +
      formatRow("COGS", rows.cogs) +
      formatRow("Gross Profit", rows.grossProfit) +
      formatRow("SG&A", rows.sga) +
      formatRow("EBITDA", rows.ebitda) +
      formatRow("D&A", rows.da) +
      formatRow("EBIT", rows.ebit) +
      formatRow("NOPAT", rows.nopat) +
      formatRow("CapEx", rows.capex) +
      formatRow("Δ NWC", rows.nwc) +
      formatRow("FCF", rows.fcf) +
      "</tbody>" +
      dcfTableClose()
    );

    // =========================
    // ASSUMPTIONS PANEL
    // =========================
    const assumptionsPanel = `
      <div class="text-block-muted mt-3">
        <strong>Model assumptions</strong><br>
        COGS: ${(assumptions.cogs_pct * 100).toFixed(1)}% ·
        SG&A: ${(assumptions.sga_pct * 100).toFixed(1)}% ·
        D&A: ${(assumptions.da_pct * 100).toFixed(1)}% ·
        CapEx: ${(assumptions.capex_pct * 100).toFixed(1)}% ·
        Δ NWC: ${(assumptions.nwc_pct * 100).toFixed(1)}% ·
        Tax: ${(assumptions.tax_rate * 100).toFixed(1)}%
      </div>
    `;

    tableEl.innerHTML = table + assumptionsPanel;

  } catch (err) {
    console.error(err);
    tableEl.innerHTML = "Error loading model";
    throw err;
  }
}
// ======================
// PEER BETA (FINAL CLEAN VERSION)
// ======================
async function loadPeerBeta(customTickers = null) {

  let tickers;

  if (customTickers && customTickers.length) {
    tickers = customTickers;
  } else {
    const input = document.getElementById("peerTickers")?.value || "AAPL,MSFT,NVDA";
    tickers = input.split(",").map(t => t.trim().toUpperCase());
  }

  const tableEl = document.getElementById("peerTableMount");
  const summaryEl = document.getElementById("peerSummary");
  const loadingEl = document.getElementById("peerLoading");

  if (!tableEl || !summaryEl || !loadingEl) {
    throw new Error("Peer beta UI is missing from the page.");
  }

  tableEl.innerHTML = "";
  summaryEl.innerHTML = "";
  loadingEl.style.display = "block";

  try {

    const data = await cachedFetch(
  `${API}/peer_beta`,
  {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ tickers })
  },
  `peer_beta-${tickers.join("-")}`
);

    // const data = res;

    loadingEl.style.display = "none";

    if (data.error) {
      tableEl.innerHTML = "Error: " + data.error;
      throw new Error(data.error);
    }

    const avgBeta = data.avg_beta ?? 0;
    const avgAssetBeta = data.avg_asset_beta ?? 0;

    let tableInner = `
      <thead>
        <tr>
          <th scope="col">Ticker</th>
          <th scope="col">Equity beta</th>
          <th scope="col">Debt ($M)</th>
          <th scope="col">Equity ($M)</th>
          <th scope="col">Asset beta</th>
        </tr>
      </thead>
      <tbody>
    `;

    (data.peers || []).forEach(p => {
      tableInner += `
        <tr>
          <th scope="row">${p.ticker}</th>
          <td>${(p.equity_beta ?? 0).toFixed(2)}</td>
          <td>$${Math.round(p.debt ?? 0).toLocaleString()}</td>
          <td>$${Math.round(p.equity ?? 0).toLocaleString()}</td>
          <td>${(p.asset_beta ?? 0).toFixed(2)}</td>
        </tr>
      `;
    });

    tableInner += "</tbody>";

    tableEl.innerHTML = dcfTableOpen() + tableInner + dcfTableClose();

    summaryEl.innerHTML = `
      <div>
        <strong>Peer Summary</strong><br>
        Avg Equity Beta: ${avgBeta.toFixed(2)}<br>
        Avg Asset Beta: <strong>${avgAssetBeta.toFixed(2)}</strong>
      </div>
    `;

    GLOBAL_BETA = avgAssetBeta;

  } catch (err) {
    console.error(err);
    loadingEl.style.display = "none";
    tableEl.innerHTML = "Error loading peer beta";
    throw err;
  }
}
async function loadWACC(tickerInput) {

  const ticker =
    tickerInput ||
    document.getElementById("waccTicker")?.value ||
    document.getElementById("mainTicker")?.value ||
    "AAPL";

  const resultEl = document.getElementById("waccResult");

  resultEl.innerHTML = "Calculating...";

  try {

    const data = await cachedFetch(
      `${API}/wacc`,
      {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          ticker: ticker,
          beta: GLOBAL_BETA
        })
      },
      `wacc-${ticker}-${GLOBAL_BETA}`
    );

    if (data.error) {
      resultEl.innerHTML = "Error: " + data.error;
      throw new Error(data.error);
    }

    // ✅ safe assignment
    if (typeof data.wacc === "number" && !isNaN(data.wacc)) {
      GLOBAL_WACC = data.wacc;
    }

    applyCustomWacc();

    const table = (
      dcfTableOpen() +
      `<thead><tr><th scope="col">Metric</th><th scope="col">Value</th></tr></thead><tbody>
        <tr><td>Equity</td><td>$${Math.round((data.equity || 0)/1e6).toLocaleString()}M</td></tr>
        <tr><td>Debt</td><td>$${Math.round((data.debt || 0)/1e6).toLocaleString()}M</td></tr>
        <tr><td>Enterprise value</td><td>$${Math.round((data.enterprise_value || 0)/1e6).toLocaleString()}M</td></tr>
        <tr><td>E/V</td><td>${((data.e_weight || 0)*100).toFixed(2)}%</td></tr>
        <tr><td>D/V</td><td>${((data.d_weight || 0)*100).toFixed(2)}%</td></tr>
        <tr><td>Beta</td><td>${(data.beta || 0).toFixed(2)}</td></tr>
        <tr><td>Cost of equity</td><td>${((data.cost_of_equity || 0)*100).toFixed(2)}%</td></tr>
        <tr><td>Cost of debt</td><td>${((data.cost_of_debt || 0)*100).toFixed(2)}%</td></tr>
        <tr><td>After-tax debt</td><td>${((data.after_tax_debt || 0)*100).toFixed(2)}%</td></tr>
        <tr><td><b>WACC</b></td><td><b>${((data.wacc || 0)*100).toFixed(2)}%</b></td></tr>
      </tbody>` +
      dcfTableClose()
    );

    resultEl.innerHTML = table;

  } catch (err) {
    console.error(err);
    resultEl.innerHTML = "Error loading WACC";
    throw err;
  }
}

async function loadStockPrice(ticker) {
  try {
    const data = await cachedFetch(
  `${API}/price`,
  {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ticker })
  },
  `price-${ticker}`
);

    // const data = res;
    GLOBAL_PRICE = data.price ?? null;

  } catch (err) {
    console.error("Error fetching stock price", err);
    throw err;
  }
}
async function generateModel() {
  
  clearCache();
  resetController();
  
  const ticker =
    document.getElementById("mainTicker")?.value || "AAPL";

  let peerInput =
    document.getElementById("peerTickers")?.value || ticker;

  let peers = peerInput
    .split(",")
    .map(t => t.trim().toUpperCase())
    .filter(Boolean);

  if (!peers.includes(ticker)) {
    peers.unshift(ticker);
  }

  const btn = document.getElementById("btnGenerateModel");
  const panel = document.getElementById("dcfPipelinePanel");
  const statusEl = document.getElementById("dcfPipelineStatus");

  __dcfGenerating = true;

  if (btn) btn.disabled = true;
  if (panel) panel.hidden = false;
  if (statusEl) statusEl.textContent = "Done!";

  dcfSetProgressRunning(true);
  dcfShowSkeletons();
  dcfResetPipelineList();
  dcfSetPipelineProgress(0, DCF_PIPELINE_STEPS.length);

  try {

    // =========================
    // 🚀 GROUP 1 (SEQUENTIAL — FIXED)
    // =========================
    await dcfRunPipelineStep("beta", () => getBeta(ticker));
    await sleep(400);

    await dcfRunPipelineStep("peerBeta", () => loadPeerBeta(peers));
    await sleep(400);

    await dcfRunPipelineStep("fullModel", () => loadFullModel(ticker));
    await sleep(400);

    await dcfRunPipelineStep("stockPrice", () => loadStockPrice(ticker));
    await sleep(600);

    // =========================
    // 🚀 GROUP 2 (SEQUENTIAL — FIXED)
    // =========================
    await dcfRunPipelineStep("wacc", () => loadWACC(ticker));
    await sleep(500);

    await dcfRunPipelineStep("comps", () => autoForecast(ticker, peers));
    await sleep(500);

    // =========================
    // 🚀 GROUP 3 (UNCHANGED)
    // =========================
    await dcfRunPipelineStep("dcf", () => runDCF());
    await dcfRunPipelineStep("apv", () => runAPV());

    // =========================
    // 🎨 UI
    // =========================
    renderFootballField();
    await renderStockChart(ticker);
    renderSummary();

  } catch (err) {
    console.error("Pipeline failed:", err);
  } finally {
    __dcfGenerating = false;

    if (btn) btn.disabled = false;

    dcfSetProgressRunning(false);
    dcfSetPipelineProgress(
      DCF_PIPELINE_STEPS.length,
      DCF_PIPELINE_STEPS.length
    );

    dcfRevealPanels();
  }
}
async function runAPV() {

  if (!__dcfGenerating) {
    dcfRevealPanels();
  }

  const resultEl = document.getElementById("apvResult");
  resultEl.innerHTML = "Calculating APV...";

  try {

    const ticker =
      document.getElementById("mainTicker")?.value || "AAPL";

    const data = await cachedFetch(
  `${API}/wacc`,
  {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ticker: ticker,
      beta: GLOBAL_BETA
    })
  },
  `wacc-${ticker}-${GLOBAL_BETA}`
);

    // const data = res;

    if (data.error) {
      resultEl.innerHTML = "Error: " + data.error;
      throw new Error(data.error);
    }

    const equity = data.equity / 1e6;
    const debt = data.debt / 1e6;

    const betaL = data.beta;
    const rd = data.cost_of_debt;
    const tax = GLOBAL_TAX || 0.21;
    const g = GLOBAL_G || 0.03;

    const dOverE = equity > 0 ? (debt / equity) : 0;
    const betaU = betaL / (1 + dOverE);

    const rA = (GLOBAL_RF || 0.04) + betaU * (GLOBAL_MRP || 0.055);

    if (!GLOBAL_FCF || GLOBAL_FCF.length === 0) {
      resultEl.innerHTML = "Run full model first";
      throw new Error("No FCF (run full model first).");
    }

    if (rA <= g) {
      resultEl.innerHTML = "Invalid inputs: rA must be > g";
      throw new Error("rA must be greater than g.");
    }

    let valueAllEquity = 0;

    GLOBAL_FCF.forEach((fcf, i) => {
      valueAllEquity += fcf / Math.pow(1 + rA, i + 1);
    });

    const lastFCF = GLOBAL_FCF[GLOBAL_FCF.length - 1];
    const terminalValue = (lastFCF * (1 + g)) / (rA - g);

    valueAllEquity += terminalValue / Math.pow(1 + rA, GLOBAL_FCF.length);

    const useRd = document.getElementById("tsToggle")?.checked;

    let taxShieldValue;

    if (useRd) {
      if (rd <= g) {
        resultEl.innerHTML = "Invalid inputs: rd must be > g";
        throw new Error("rd must be greater than g.");
      }
      taxShieldValue = (debt * rd * tax) / (rd - g);
    } else {
      taxShieldValue = (debt * rd * tax) / (rA - g);
    }

    const totalAPV = valueAllEquity + taxShieldValue;

    const shares = GLOBAL_SHARES || 14681;
    const pricePerShare = totalAPV / shares;

    GLOBAL_VALUATIONS.apv = {
      low: pricePerShare * 0.9,
      base: pricePerShare,
      high: pricePerShare * 1.1
    };

    resultEl.innerHTML = (
      dcfTableOpen() +
      `<thead><tr><th scope="col">Metric</th><th scope="col">Value</th></tr></thead><tbody>
        <tr><th scope="row">Unlevered beta (βᵤ)</th><td>${betaU.toFixed(2)}</td></tr>
        <tr><th scope="row">Cost of assets (r<sub>A</sub>)</th><td>${(rA * 100).toFixed(2)}%</td></tr>
        <tr><th scope="row">APV per share</th><td><strong>$${pricePerShare.toFixed(2)}</strong></td></tr>
      </tbody>` +
      dcfTableClose()
    );

  } catch (err) {
    console.error(err);
    if (__dcfGenerating) {
      resultEl.innerHTML = "Error calculating APV";
      throw err;
    }
    if (resultEl.textContent.trim() === "Calculating APV...") {
      resultEl.innerHTML = "Error calculating APV";
    }
  }
}
function renderFootballField() {

  try {

  const canvas = document.getElementById("footballChart");
  if (!canvas) throw new Error("Football chart canvas missing");

  const ctx = canvas.getContext("2d");

  if (window.footballChart && typeof window.footballChart.destroy === "function") {
    window.footballChart.destroy();
  }

  function safe(v) {
    return (typeof v === "number" && !isNaN(v)) ? v : 0;
  }

  const labels = ["DCF", "APV", "Comps"];

  const dcf = GLOBAL_VALUATIONS.dcf || {};
  const apv = GLOBAL_VALUATIONS.apv || {};
  const comps = GLOBAL_VALUATIONS.comps || {};

  const lows = [
    safe(dcf.low),
    safe(apv.low),
    safe(comps.low)
  ];

  const highs = [
    safe(dcf.high),
    safe(apv.high),
    safe(comps.high)
  ];

  const mids = [
    safe(dcf.base),
    safe(apv.base),
    safe(comps.base)
  ];
  const rangeData = [
    [lows[0], highs[0]],
    [lows[1], highs[1]],
    [lows[2], highs[2]]
  ];

  const midpointData = mids.map((m, i) => ({
    x: m,
    y: labels[i]
  }));

  const marketData = labels.map(label => ({
    x: GLOBAL_PRICE || 0,
    y: label
  }));

  const {
    grid,
    tick,
    footballBars,
    footballMidpoint,
    footballMarket
  } = getChartThemeColors();
  const xMin = Math.min(...lows, 0) * 0.9;
  const xMax = Math.max(...highs, 1) * 1.1;

  window.footballChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Range",
          data: rangeData,
          backgroundColor: footballBars
        },
        {
          label: "Midpoint",
          type: "scatter",
          data: midpointData,
          backgroundColor: footballMidpoint,
          pointRadius: 8
        },
        {
          label: "Market",
          type: "scatter",
          data: marketData,
          backgroundColor: footballMarket,
          pointRadius: 6
        }
      ]
    },

    options: {
      indexAxis: "y",
      responsive: true,

      scales: {
        x: {
          type: "linear",
          min: xMin,
          max: xMax,
          ticks: {
            color: tick,
            callback: function(value) {
              return "$" + Number(value).toLocaleString();
            }
          },
          grid: { color: grid, drawBorder: false }
        },
        y: {
          type: "category",
          ticks: { color: tick },
          grid: { color: grid, drawBorder: false }
        }
      },

      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {

              if (context.dataset.label === "Midpoint") {
                return `Mid: $${context.raw.x.toFixed(2)}`;
              }

              if (context.dataset.label === "Market") {
                return `Market: $${context.raw.x.toFixed(2)}`;
              }

              const i = context.dataIndex;

              return [
                `Low: $${lows[i].toFixed(2)}`,
                `High: $${highs[i].toFixed(2)}`
              ];
            }
          }
        }
      }
    }
  });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

let stockChart;
function renderBetaChart(marketReturns, stockReturns, beta, alpha) {

  const ctx = document.getElementById("betaChart");
  if (!ctx) return;

  if (window.betaChart && typeof window.betaChart.destroy === "function") {
    window.betaChart.destroy();
  }

  const scatterData = marketReturns.map((m, i) => ({
    x: m,
    y: stockReturns[i]
  }));

  const minX = Math.min(...marketReturns);
  const maxX = Math.max(...marketReturns);

  const lineData = [
    { x: minX, y: alpha + beta * minX },
    { x: maxX, y: alpha + beta * maxX }
  ];

  const { grid, tick, scatter, regressionLine } = getChartThemeColors();

  window.betaChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Returns",
          data: scatterData,
          pointRadius: 4,
          backgroundColor: scatter,
          borderColor: scatter
        },
        {
          label: "Regression line",
          data: lineData,
          type: "line",
          borderColor: regressionLine,
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          title: { display: true, text: "Market returns", color: tick },
          ticks: {
            color: tick,
            callback: v => (v * 100).toFixed(1) + "%"
          },
          grid: { color: grid, drawBorder: false }
        },
        y: {
          title: { display: true, text: "Stock returns", color: tick },
          ticks: {
            color: tick,
            callback: v => (v * 100).toFixed(1) + "%"
          },
          grid: { color: grid, drawBorder: false }
        }
      }
    }
  });
}
async function renderStockChart(ticker) {

  try {

    const data = await cachedFetch(
  `${API}/price_history`,
  {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ticker })
  },
  `price_history-${ticker}`
);

    // const data = res;

    if (data.error) {
      console.error(data.error);
      throw new Error(data.error);
    }

    const canvas = document.getElementById("stockChart");
    if (!canvas) throw new Error("Stock chart canvas missing");

    const ctx = canvas.getContext("2d");

    if (stockChart && typeof stockChart.destroy === "function") {
      stockChart.destroy();
    }
    const intrinsic = GLOBAL_VALUATIONS?.dcf?.base ?? null;

    const intrinsicLine = data.prices.map(() => intrinsic);
    const { grid, tick, legend, seriesPrimary, seriesSecondary } = getChartThemeColors();

    stockChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.dates,
        datasets: [
          {
            label: "Stock price",
            data: data.prices,
            borderColor: seriesPrimary,
            borderWidth: 2,
            tension: 0
          },
          {
            label: "Intrinsic value",
            data: intrinsicLine,
            borderDash: [5, 5],
            borderColor: seriesSecondary,
            borderWidth: 2,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            ticks: { color: tick, maxRotation: 0 },
            grid: { color: grid, drawBorder: false }
          },
          y: {
            ticks: {
              color: tick,
              callback: function(value) {
                return "$" + Number(value).toLocaleString();
              }
            },
            grid: { color: grid, drawBorder: false }
          }
        },
        plugins: {
          legend: {
            labels: { color: legend, font: { weight: "600" } }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const isLast = context.dataIndex === context.dataset.data.length - 1;
                if (!isLast) return null;
                return `${context.dataset.label}: $${Number(context.raw).toFixed(2)}`;
              }
            }
          }
        }
      }
    });

    const summaryEl = document.getElementById("valuationSummary");

    if (summaryEl && GLOBAL_PRICE && intrinsic) {

      const upside = ((intrinsic - GLOBAL_PRICE) / GLOBAL_PRICE) * 100;

      let signal;
      let sigColor = "#ff9800";
      if (upside > 20) {
        signal = "Buy";
        sigColor = "#4caf50";
      } else if (upside < -20) {
        signal = "Sell";
        sigColor = "#f44336";
      } else {
        signal = "Hold";
      }

      summaryEl.innerHTML =
        `<p class="mb-0">Intrinsic $${intrinsic.toFixed(2)} · Market $${GLOBAL_PRICE.toFixed(2)} · Upside ${upside.toFixed(1)}% · <strong style="color:${sigColor}">${signal}</strong></p>`;
    }

  } catch (err) {
    console.error("Error rendering stock chart:", err);
    throw err;
  }
}

function renderSummary() {

  try {

  const el = document.getElementById("valuationSummaryBox");
  if (!el) throw new Error("Valuation summary box missing");

  const price = GLOBAL_PRICE;
  if (!price) {
    el.innerHTML = "No market price available";
    throw new Error("No market price");
  }

  function calc(val) {
    if (!val) return { pct: 0, signal: "N/A", color: "gray" };

    const pct = ((val - price) / price) * 100;

    let signal, color;

    if (pct > 20) {
      signal = "Buy";
      color = "#4caf50";
    } else if (pct < -20) {
      signal = "Sell";
      color = "#f44336";
    } else {
      signal = "Hold";
      color = "#ff9800";
    }

    return { pct, signal, color };
  }

  const dcf = GLOBAL_VALUATIONS.dcf?.base;
  const apv = GLOBAL_VALUATIONS.apv?.base;
  const comps = GLOBAL_VALUATIONS.comps?.base;

  const rowD = calc(dcf);
  const rowA = calc(apv);
  const rowC = calc(comps);

  const signals = [rowD.signal, rowA.signal, rowC.signal];

  const buyCount = signals.filter(s => s === "Buy").length;
  const sellCount = signals.filter(s => s === "Sell").length;

  let final, confidence;

  if (buyCount >= 2) {
    final = "Buy";
    confidence = "High";
  } else if (sellCount >= 2) {
    final = "Sell";
    confidence = "High";
  } else {
    final = "Hold";
    confidence = "Medium";
  }

  const explanation = [];

  if (GLOBAL_WACC > 0.12) {
    explanation.push("Discount rate is on the high side.");
  }
  if (GLOBAL_G < 0.03) {
    explanation.push("Terminal growth is conservative.");
  }
  if (GLOBAL_BETA > 1.5) {
    explanation.push("Beta is elevated.");
  }
  if (dcf && comps && Math.abs(dcf - comps) / comps > 0.3) {
    explanation.push("DCF and comps disagree by more than 30%.");
  }
  if (explanation.length === 0) {
    explanation.push("No major flags from these checks.");
  }

  let sensitivity = "";
  if (GLOBAL_WACC > 0.12) {
    sensitivity = "Output moves a lot if WACC shifts.";
  } else if (GLOBAL_WACC < 0.08) {
    sensitivity = "Less sensitive to small WACC moves.";
  } else {
    sensitivity = "Typical sensitivity to WACC and growth.";
  }

  const finalColor = final === "Buy"
    ? "#4caf50"
    : final === "Sell"
      ? "#f44336"
      : "#ff9800";

  el.innerHTML = `
    <div class="dcf-summary-card" style="max-width: 520px;">
      <p class="text-block-muted" style="margin: 0 0 1rem;">Market: $${price.toFixed(2)}</p>
      <div style="line-height:1.75;">
        <div><strong>DCF</strong> $${dcf?.toFixed(2) ?? "—"}
          <span style="color:${rowD.color}"> (${rowD.pct.toFixed(1)}%, ${rowD.signal})</span></div>
        <div><strong>APV</strong> $${apv?.toFixed(2) ?? "—"}
          <span style="color:${rowA.color}"> (${rowA.pct.toFixed(1)}%, ${rowA.signal})</span></div>
        <div><strong>Comps</strong> $${comps?.toFixed(2) ?? "—"}
          <span style="color:${rowC.color}"> (${rowC.pct.toFixed(1)}%, ${rowC.signal})</span></div>
      </div>
      <hr style="margin:1rem 0; border-color:var(--border)">
      <div>
        <strong>Blend:</strong>
        <span style="color:${finalColor}; font-weight:600;"> ${final}</span>
        <span class="text-block-muted"> (${confidence} confidence)</span>
      </div>
      <hr style="margin:1rem 0; border-color:var(--border)">
      <div class="text-block-muted" style="font-size:0.9rem;">
        ${explanation.map(e => `${e}`).join(" ")}
      </div>
      <p class="text-block-muted" style="margin: 0.75rem 0 0; font-size:0.9rem;">${sensitivity}</p>
    </div>
  `;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var st = document.getElementById("dcfPipelineStatus");
  if (st) st.textContent = "Run Generate model to load data and run the full pipeline.";
});

window.addEventListener("site-theme-changed", function () {
  try {
    if (GLOBAL_FCF && GLOBAL_FCF.length) {
      renderChart(GLOBAL_FCF);
    }
    if (GLOBAL_VALUATIONS && (GLOBAL_VALUATIONS.dcf.base || GLOBAL_VALUATIONS.apv.base)) {
      setTimeout(renderFootballField, 50);
    }
  } catch (_) {}
});