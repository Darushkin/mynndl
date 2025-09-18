// Titanic EDA - app.js
// Uses PapaParse + Chart.js, all client-side
let trainData = [];

// Load CSV
document.getElementById("loadBtn").addEventListener("click", () => {
  const file = document.getElementById("trainFile").files[0];
  if (!file) { alert("Please upload train.csv"); return; }

  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      trainData = results.data.filter(r => r.Survived !== undefined && r.Survived !== "");
      previewData(trainData);
      plotMissingValues(trainData);
      plotSurvivalCharts(trainData);
    }
  });
});

// Show small preview
function previewData(data) {
  const head = data.slice(0, 5);
  let html = "<table><tr>";
  Object.keys(head[0]).forEach(k => html += `<th>${k}</th>`);
  html += "</tr>";
  head.forEach(row => {
    html += "<tr>";
    Object.values(row).forEach(v => html += `<td>${v}</td>`);
    html += "</tr>";
  });
  html += "</table>";
  document.getElementById("dataPreview").innerHTML = html;
}

// Missing values % chart
function plotMissingValues(data) {
  const cols = Object.keys(data[0]);
  let missingCounts = {};
  cols.forEach(c => { missingCounts[c] = 0; });

  data.forEach(row => {
    cols.forEach(c => { if (row[c] === null || row[c] === "" || row[c] === undefined) missingCounts[c]++; });
  });

  const labels = cols;
  const values = cols.map(c => (missingCounts[c] / data.length) * 100);

  new Chart(document.getElementById("missingChart"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{ label: "% Missing", data: values }]
    }
  });
}

// Plot survival by categorical/numerical feature
function plotSurvivalCharts(data) {
  // Sex
  const sexGroups = groupByFeature(data, "Sex");
  plotBarChart("sexChart", "Survival by Sex", sexGroups);

  // Pclass
  const pclassGroups = groupByFeature(data, "Pclass");
  plotBarChart("pclassChart", "Survival by Pclass", pclassGroups);

  // Age (bucketed)
  data.forEach(r => { r.AgeGroup = (r.Age !== null && !isNaN(r.Age)) ? Math.floor(r.Age/10)*10 : "Unknown"; });
  const ageGroups = groupByFeature(data, "AgeGroup");
  plotBarChart("ageChart", "Survival by Age Group", ageGroups);

  // Embarked
  const embGroups = groupByFeature(data, "Embarked");
  plotBarChart("embarkedChart", "Survival by Embarked", embGroups);
}

// Helper: group by feature and compute survival %
function groupByFeature(data, feature) {
  let groups = {};
  data.forEach(r => {
    let key = r[feature];
    if (key === "" || key === undefined) key = "Unknown";
    if (!groups[key]) groups[key] = { survived: 0, total: 0 };
    groups[key].total++;
    if (r.Survived === 1) groups[key].survived++;
  });
  let result = {};
  Object.keys(groups).forEach(k => {
    result[k] = (groups[k].survived / groups[k].total) * 100; // survival %
  });
  return result;
}

// Helper: generic bar chart
function plotBarChart(canvasId, title, dataObj) {
  new Chart(document.getElementById(canvasId), {
    type: "bar",
    data: {
      labels: Object.keys(dataObj),
      datasets: [{
        label: "% Survived",
        data: Object.values(dataObj),
        backgroundColor: "rgba(52,152,219,0.7)"
      }]
    },
    options: {
      plugins: { title: { display: true, text: title } },
      scales: { y: { min: 0, max: 100 } }
    }
  });
}

// Find strongest death factor
document.getElementById("analyzeBtn").addEventListener("click", () => {
  if (trainData.length === 0) { alert("Load data first"); return; }

  // Compare correlation-like effect (mean survival diff)
  const features = ["Sex", "Pclass", "AgeGroup", "Embarked"];
  let results = {};

  features.forEach(f => {
    let groups = groupByFeature(trainData, f);
    // For importance: measure variance of survival rates between groups
    let values = Object.values(groups);
    let variance = Math.max(...values) - Math.min(...values);
    results[f] = variance;
  });

  // Find max
  let sorted = Object.entries(results).sort((a,b) => b[1]-a[1]);
  const top = sorted[0][0];

  document.getElementById("result").innerText = 
    "The most important factor of death is: " + top + 
    " (largest difference in survival rates across groups)";
});
