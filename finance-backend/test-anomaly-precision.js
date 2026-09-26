// test-anomaly-precision.js
// test-anomaly-precision.js
//
// Simulates the EXACT statistical rule used in utils/anomalyDetector.js:
//   safeStdDev = max(historicalStdDev, 1)
//   zScore = (amount - historicalMean) / safeStdDev
//   flagged = zScore > 2
//
// This isolates the detection RULE from the Groq-based "isFraud" explanation
// (which only labels an already-flagged transaction, it doesn't decide the flag).
// No DB connection or API key needed — pure math, runs anywhere with Node.

function randomNormal(mean, stdDev) {
  // Box-Muller transform for a realistic spending distribution
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdDev;
}

function detectAnomaly(amount, historicalMean, historicalStdDev) {
  const safeStdDev = Math.max(historicalStdDev, 1);
  const zScore = (amount - historicalMean) / safeStdDev;
  return { flagged: zScore > 2, zScore };
}

function runSimulation(trials = 5000, anomalyRate = 0.3) {
  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (let i = 0; i < trials; i++) {
    // Simulate one category's realistic spending baseline (₹200–₹1000 avg)
    const baselineMean = 200 + Math.random() * 800;
    const baselineStdDev = baselineMean * (0.15 + Math.random() * 0.15); // 15–30% variance

    // Build a 20-transaction history and compute mean/stdDev exactly like the
    // Mongo aggregation ($avg, $stdDevPop) does in anomalyDetector.js
    const history = Array.from({ length: 20 }, () =>
      Math.max(1, randomNormal(baselineMean, baselineStdDev))
    );
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;
    const stdDev = Math.sqrt(variance);

    // Label ground truth: is this incoming transaction a genuine anomaly?
    const isTrueAnomaly = Math.random() < anomalyRate;
    const amount = isTrueAnomaly
      ? baselineMean * (2.5 + Math.random() * 3.5) // 2.5x–6x spike
      : Math.max(1, randomNormal(baselineMean, baselineStdDev));

    const { flagged } = detectAnomaly(amount, mean, stdDev);

    if (flagged && isTrueAnomaly) tp++;
    else if (flagged && !isTrueAnomaly) fp++;
    else if (!flagged && !isTrueAnomaly) tn++;
    else fn++;
  }

  const precision = (tp / (tp + fp)) * 100;
  const recall = (tp / (tp + fn)) * 100;
  const f1 = (2 * precision * recall) / (precision + recall);

  console.log("===== Z-SCORE ANOMALY DETECTION — SIMULATION RESULTS =====");
  console.log(`Trials: ${trials} (${(anomalyRate * 100).toFixed(0)}% true anomaly rate)`);
  console.log(`TP: ${tp} | FP: ${fp} | TN: ${tn} | FN: ${fn}`);
  console.log(`Precision: ${precision.toFixed(1)}%`);
  console.log(`Recall:    ${recall.toFixed(1)}%`);
  console.log(`F1 Score:  ${f1.toFixed(1)}%`);
}

runSimulation();