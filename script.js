function formatCurrency(value) {
  return "$" + (value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
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

function calculateScenario(n) {
  const homePrice =
    parseFloat(document.getElementById(`loanAmount${n}`).value) || 0;
  const downPaymentPercent =
    parseFloat(document.getElementById(`downPayment${n}`).value) || 0;
  const annualRate =
    (parseFloat(document.getElementById(`interestRate${n}`).value) || 0) / 100;
  const months =
    (parseInt(document.getElementById(`loanTerm${n}`).value) || 0) * 12;

  const downPaymentAmount = homePrice * (downPaymentPercent / 100);
  const loanAmount = homePrice - downPaymentAmount;
  const monthlyRate = annualRate / 12;

  let monthlyPayment;

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

    labels.push((i / 12).toFixed(1));
    principalData.push(principal);
    interestData.push(interest);
  }

  const totalPayment = monthlyPayment * months;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    downPaymentAmount,
    loanAmount,
    labels,
    principalData,
    interestData,
  };
}

function calculateAmortization() {
  const s1 = calculateScenario(1);
  const s2 = calculateScenario(2);
  const s3 = calculateScenario(3);

  // ✅ SUMMARY TABLE
  const summaryBody = document.querySelector(
    "#amortizationSummaryTable tbody"
  );
  summaryBody.innerHTML = "";

  const scenarios = [s1, s2, s3];

  scenarios.forEach((s, i) => {
    const row = `
      <tr>
        <td>${i + 1}</td>
        <td>${formatCurrency(s.monthlyPayment)}</td>
        <td>${formatCurrency(s.totalPayment)}</td>
        <td>${formatCurrency(s.totalInterest)}</td>
        <td>${formatCurrency(s.downPaymentAmount)}</td>
        <td>${formatCurrency(s.loanAmount)}</td>
      </tr>
    `;
    summaryBody.innerHTML += row;
  });

  // ✅ AMORTIZATION TABLE (Scenario 1 only)
  const tableBody = document.querySelector("#amortizationTable tbody");
  tableBody.innerHTML = "";

  let balance = s1.loanAmount;
  const monthlyRate =
    (parseFloat(document.getElementById("interestRate1").value) || 0) / 100 / 12;

  for (let i = 0; i < s1.principalData.length; i++) {
    const interest = balance * monthlyRate;
    const principal = s1.monthlyPayment - interest;
    balance -= principal;

    const row = `
      <tr>
        <td>${i + 1}</td>
        <td>${formatCurrency(s1.monthlyPayment)}</td>
        <td>${formatCurrency(principal)}</td>
        <td>${formatCurrency(interest)}</td>
        <td>${formatCurrency(balance > 0 ? balance : 0)}</td>
      </tr>
    `;

    tableBody.innerHTML += row;
  }

  // ✅ CHART (Scenario 1)
  const ctx = document
    .getElementById("amortizationChart")
    .getContext("2d");

  if (window.myChart) {
    window.myChart.destroy();
  }

  const textColor = getCssVar("--text", "#ffffff");
  const borderColor = getCssVar("--border", "#2a2a2a");

  window.myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: s1.labels,
      datasets: [
        {
          label: "Principal",
          data: s1.principalData,
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Interest",
          data: s1.interestData,
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
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

async function getBeta() {
  const ticker = document.getElementById("ticker").value;

  const response = await fetch("http://127.0.0.1:5000/beta", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ticker })
  });

  const result = await response.json();

  document.getElementById("betaResult").innerText =
    "Beta: " + result.beta.toFixed(2);
}