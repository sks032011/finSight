const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Anomaly = require("../models/Anomaly");
const User = require("../models/User");
const { sendAnomalyAlert } = require("./emailService");
const { Groq } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function checkAndCreateAnomaly(userId, expense) {
  try {
    // skip if anomaly already exists for this expense
    const existing = await Anomaly.findOne({ userId, expenseId: expense._id });
    if (existing) return existing;

    // gettin historical baseline using aggregation pipeline
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historicalData = await Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          category: expense.category,
          date: { $gte: sixMonthsAgo, $lt: new Date(expense.date) },
          _id: { $ne: expense._id } // Exclude current expense
        }
      },
      {
        $group: {
          _id: null,
          mean: { $avg: "$amount" },
          stdDev: { $stdDevPop: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // need at least 3 prior transactions to establish baseline
    if (!historicalData.length || historicalData[0].count < 3) return null;

    const { mean, stdDev, count } = historicalData[0];

    // avoid division by zero
    const safeStdDev = stdDev === 0 ? mean * 0.1 : stdDev;

    // zscore calc
    const zScore = (expense.amount - mean) / safeStdDev;

    //  flag if Z > 2 (95th perc)
    if (zScore <= 2) return null;

    const anomalyScore = Math.min(Math.round((zScore / 4) * 100), 100);

    // AI explanation
    let aiExplanation = null;
    try {
      const prompt = `You are a fraud detection AI. Analyze this unusual expense.
Transaction: "${expense.description}"
Amount: ₹${expense.amount}
Category: ${expense.category}
Historical average: ₹${Math.round(mean)}
Z-Score: ${zScore.toFixed(2)}

Is this a legitimate splurge or potential fraud?

Respond ONLY in JSON:
{"reason": "Brief explanation", "severity": "low|medium|high", "isFraud": true/false, "fraudConfidence": 0.0}`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "openai/gpt-oss-20b",
        temperature: 0.1,
        max_tokens: 200
      });

      let jsonText = completion.choices[0].message.content.trim();
      if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/```json\n?/g, "").replace(/```/g, "");
      else if (jsonText.startsWith("```")) jsonText = jsonText.replace(/```\n?/g, "");

      aiExplanation = JSON.parse(jsonText);
    } catch (aiError) {
      console.error("AI anomaly explanation failed, using fallback");
      aiExplanation = {
        reason: "Statistically unusually high amount based on past spending.",
        severity: anomalyScore > 75 ? "high" : "medium",
        isFraud: false,
        fraudConfidence: 0
      };
    }

    const anomaly = new Anomaly({
      userId,
      expenseId: expense._id,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
      historicalMean: Math.round(mean * 100) / 100,
      historicalStdDev: Math.round(safeStdDev * 100) / 100,
      historicalCount: count,
      zScore: parseFloat(zScore.toFixed(2)),
      anomalyScore,
      aiExplanation,
      status: "pending"
    });

    await anomaly.save();

    // FIRE AND FORGET mail alert (non blocking)
    User.findById(userId)
      .select("email name settings")
      .then(user => {
        if (user?.settings?.emailAlerts !== false) {
          sendAnomalyAlert(
            user.email,
            user.name,
            expense.description,
            expense.amount,
            anomalyScore,
            expense.category
          ).catch(console.error);
        }
      })
      .catch(console.error);

    return anomaly;
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return null;
  }
}

function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return Math.abs((value - mean) / stdDev);
}

function zScoreToAnomalyScore(zScore) {
  if (zScore <= 1) return 0;
  if (zScore >= 3) return 100;
  return Math.round(((zScore - 1) / 2) * 100);
}

module.exports = {
  checkAndCreateAnomaly,
  calculateZScore,
  zScoreToAnomalyScore
};