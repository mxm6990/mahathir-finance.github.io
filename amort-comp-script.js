function formatCurrency(value) {
  return "$" + (value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function getScenarioLabel(n) {
  const select = document.getElementById("scenarioSelect");
  if (select) {
    const opt = select.querySelector(`option[value="${String(n)}"]`);
    if (opt) return opt.textContent.trim();
  }
  return `Scenario ${n}`;
}

function applyChartTheme(chart) {
  if (!chart) return;

  const textColor = getCssVar("--text", "#ffffff");
  const borderColor = getCssVar("--border", "#2a2a2a");

  if (chart.options?.plugins?.legend?.labels) {
    chart.options.plugins.legend.labels.color = textColor;
  }

  if (chart.options?.scales) {
    if (chart.options.scales.x?.ticks)
      chart.options.scales.x.ticks.color = textColor;
    if (chart.options.scales.y?.ticks)
      chart.options.scales.y.ticks.color = textColor;
    if (chart.options.scales.x?.grid)
      chart.options.scales.x.grid.color = borderColor;
    if (chart.options.scales.y?.grid)
      chart.options.scales.y.grid.color = borderColor;
  }

  chart.update();
}

window.addEventListener("site-theme-changed", () => {
  applyChartTheme(window.myChart);
});

// Core calculation logic (reusable)
function calculateScenario(n) {
  const homePrice =
    parseFloat(document.getElementById(`loanAmount${n}`).value) || 0;
  const downPaymentPercent =
    parseFloat(document.getElementById(`downPayment${n}`).value) || 0;
  const annualRate =
    (parseFloat(document.getElementById(`interestRate${n}`).value) || 0) / 100;
  const months =
    (parseInt(document.getElementById(`loanTerm${n}`).value, 10) || 0) * 12;

  const downPaymentAmount = homePrice * (downPaymentPercent / 100);
  const loanAmount = homePrice - downPaymentAmount;
  const monthlyRate = annualRate / 12;

  let monthlyPayment = 0;

  if (months === 0) return null;

  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / months;
  } else {
    monthlyPayment =
      loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
  }

  let balance = loanAmount;
  let totalInterest = 0;

  let principalData = [];
  let interestData = [];
  let labels = [];

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance -= principal;

    totalInterest += interest;

    labels.push(i);
    principalData.push(principal);
    interestData.push(interest);
  }

  return {
    monthlyPayment,
    totalPayment: monthlyPayment * months,
    totalInterest,
    downPaymentAmount,
    loanAmount,
    labels,
    principalData,
    interestData,
    rate: monthlyRate,
  };
}

// Store globally so dropdown can access
let scenarios = {};

// Main function
function calculateAmortization() {
  const s1 = calculateScenario(1);
  const s2 = calculateScenario(2);
  const s3 = calculateScenario(3);

  scenarios = { 1: s1, 2: s2, 3: s3 };

  const summaryBody = document.querySelector("#amortizationSummaryTable tbody");
  if (summaryBody) summaryBody.innerHTML = "";

  [s1, s2, s3].forEach((s, i) => {
    if (!s || !summaryBody) return;

    summaryBody.innerHTML += `
      <tr>
        <th scope="row">${i + 1}</th>
        <td>${formatCurrency(s.monthlyPayment)}</td>
        <td>${formatCurrency(s.totalPayment)}</td>
        <td>${formatCurrency(s.totalInterest)}</td>
        <td>${formatCurrency(s.downPaymentAmount)}</td>
        <td>${formatCurrency(s.loanAmount)}</td>
      </tr>
    `;
  });

  const select = document.getElementById("scenarioSelect");
  const n = select ? parseInt(select.value, 10) || 1 : 1;
  renderTableAndChart(n);
}

// Render BOTH table + chart together
function renderTableAndChart(n) {
  const s = scenarios[n];
  if (!s) return;

  const heading = document.getElementById("amortizationTableHeading");
  if (heading) {
    heading.textContent = `${getScenarioLabel(n)} — Amortization schedule`;
  }

  const tableBody = document.querySelector("#amortizationTable tbody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  let balance = s.loanAmount;

  for (let i = 0; i < s.principalData.length; i++) {
    const interest = balance * s.rate;
    const principal = s.monthlyPayment - interest;
    balance -= principal;

    tableBody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${formatCurrency(s.monthlyPayment)}</td>
        <td>${formatCurrency(principal)}</td>
        <td>${formatCurrency(interest)}</td>
        <td>${formatCurrency(balance > 0 ? balance : 0)}</td>
      </tr>
    `;
  }

  const canvas = document.getElementById("amortizationChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (window.myChart) {
    window.myChart.destroy();
  }

  const textColor = getCssVar("--text", "#ffffff");
  const borderColor = getCssVar("--border", "#2a2a2a");

  window.myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: s.labels,
      datasets: [
        {
          label: `Principal (${getScenarioLabel(n)})`,
          data: s.principalData,
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: `Interest (${getScenarioLabel(n)})`,
          data: s.interestData,
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: textColor },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: borderColor },
        },
        y: {
          ticks: { color: textColor },
          grid: { color: borderColor },
        },
      },
    },
  });

  applyChartTheme(window.myChart);
}

document.addEventListener("DOMContentLoaded", () => {
  const selector = document.getElementById("scenarioSelect");

  if (selector) {
    selector.addEventListener("change", function () {
      renderTableAndChart(this.value);
    });
  }
});
