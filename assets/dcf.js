function formatCurrency(value) {
  return "$" + value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function setError(message) {
  const el = document.getElementById("dcfError");
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
}

function runDCF() {
  setError("");

  const fcf0 = parseFloat(document.getElementById("fcf0").value);
  const fcfGrowthPct = parseFloat(document.getElementById("fcfGrowth").value);
  const years = parseInt(document.getElementById("years").value, 10);
  const waccPct = parseFloat(document.getElementById("wacc").value);
  const tgPct = parseFloat(document.getElementById("tg").value);
  const netDebt = parseFloat(document.getElementById("netDebt").value) || 0;

  if (!Number.isFinite(fcf0) || fcf0 < 0) {
    setError("Enter a valid year-one free cash flow (non-negative number).");
    return;
  }
  if (!Number.isFinite(years) || years < 1 || years > 30) {
    setError("Forecast years must be between 1 and 30.");
    return;
  }
  if (!Number.isFinite(waccPct) || waccPct <= 0) {
    setError("WACC must be a positive percentage.");
    return;
  }

  const wacc = waccPct / 100;
  const gExplicit = (Number.isFinite(fcfGrowthPct) ? fcfGrowthPct : 0) / 100;
  const gTerminal = (Number.isFinite(tgPct) ? tgPct : 0) / 100;

  if (gTerminal >= wacc) {
    setError("Terminal growth must be less than WACC for the perpetuity formula to apply.");
    return;
  }

  const fcfSeries = [];
  let f = fcf0;
  for (let y = 1; y <= years; y++) {
    if (y > 1) f *= 1 + gExplicit;
    fcfSeries.push(f);
  }

  let pvExplicit = 0;
  for (let y = 1; y <= years; y++) {
    pvExplicit += fcfSeries[y - 1] / Math.pow(1 + wacc, y);
  }

  const fcfLast = fcfSeries[years - 1];
  const terminalFcf = fcfLast * (1 + gTerminal);
  const terminalValue = terminalFcf / (wacc - gTerminal);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, years);

  const enterpriseValue = pvExplicit + pvTerminal;
  const equityValue = enterpriseValue - netDebt;

  document.getElementById("pvExplicit").textContent = formatCurrency(pvExplicit);
  document.getElementById("pvTerminal").textContent = formatCurrency(pvTerminal);
  document.getElementById("enterpriseValue").textContent = formatCurrency(enterpriseValue);
  document.getElementById("equityValue").textContent = formatCurrency(equityValue);
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("dcfRun");
  if (btn) btn.addEventListener("click", runDCF);
  const inputIds = ["fcf0", "fcfGrowth", "years", "wacc", "tg", "netDebt"];
  inputIds.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", runDCF);
  });
  runDCF();
});
