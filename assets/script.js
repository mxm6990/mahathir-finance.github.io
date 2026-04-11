

function formatCurrency(value) {
  return "$" + value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
    if (chart.options.scales.x?.ticks) chart.options.scales.x.ticks.color = textColor;
    if (chart.options.scales.y?.ticks) chart.options.scales.y.ticks.color = textColor;

    if (chart.options.scales.x?.grid) chart.options.scales.x.grid.color = borderColor;
    if (chart.options.scales.y?.grid) chart.options.scales.y.grid.color = borderColor;
  }

  chart.update();
}

window.addEventListener("site-theme-changed", () => {
  applyChartTheme(window.myChart);
});

function calculateAmortization() {
  //const downPaymentPercent = parseFloat(document.getElementById("downPayment").value) || 0;
  const homePrice = parseFloat(document.getElementById("loanAmount").value);

  const downPaymentPercent = parseFloat(document.getElementById("downPayment").value) || 0;

  const downPaymentAmount = homePrice * (downPaymentPercent / 100);

  const loanAmount = homePrice - downPaymentAmount;
  const annualRate = parseFloat(document.getElementById("interestRate").value) / 100; // Fetches annual rate amount from amortization-tracker.html
  const months = parseInt(document.getElementById("loanTerm").value) * 12; // Fetches loan term from amortization-tracker.html


  const monthlyRate = annualRate / 12;

  //Buckets for Graph

  let principalData = [];
  let interestData = [];
  let labels = [];

  // Monthly payment formula
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  

  document.getElementById("monthlyPayment").innerText =
    "Monthly Payment: $" + monthlyPayment.toFixed(2);

  let balance = loanAmount;
  let totalInterest = 0;
  const tableBody = document.querySelector("#amortizationTable tbody");
  tableBody.innerHTML = "";

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance -= principal;

    labels.push(i); // month
    principalData.push(principal);
    interestData.push(interest);

    totalInterest += interest;

    const row = `
      <tr>
        <td>${i}</td>
        <td>${formatCurrency(monthlyPayment)}</td>
        <td>${formatCurrency(principal)}</td>
        <td>${formatCurrency(interest)}</td>
        <td>${formatCurrency(balance > 0 ? balance : 0)}</td>
      </tr>
    `;

    tableBody.innerHTML += row;
  }
  const totalPayment =monthlyPayment*months;
  //Display Summation Results

  document.getElementById("monthlyPayment").innerText = formatCurrency(monthlyPayment);
  document.getElementById("totalPayment").innerText = formatCurrency(totalPayment);
  document.getElementById("totalInterest").innerText = formatCurrency(totalInterest);
  document.getElementById("downPaymentDisplay").innerText = formatCurrency(downPaymentAmount);
  document.getElementById("loanAmountDisplay").innerText = formatCurrency(loanAmount);

  const ctx = document.getElementById('amortizationChart').getContext('2d');

// destroy old chart if exists
if (window.myChart) {
  window.myChart.destroy();
}

  const textColor = getCssVar("--text", "#ffffff");
  const borderColor = getCssVar("--border", "#2a2a2a");

window.myChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labels,
    datasets: [
      {
        label: 'Principal',
        data: principalData,
        borderWidth: 2
      },
      {
        label: 'Interest',
        data: interestData,
        borderWidth: 2
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: textColor
        }
      }
    },
    scales: {
      x: {
        ticks: { color: textColor },
        grid: { color: borderColor }
      },
      y: {
        ticks: { color: textColor },
        grid: { color: borderColor }
      }
    }
  }
});

  // Ensure colors match current theme immediately (including initial load).
  applyChartTheme(window.myChart);
}