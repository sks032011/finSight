// routes/insights.js
const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Insight = require("../models/Insight");
const { Groq } = require("groq-sdk");

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ========== GENERATE MONTHLY INSIGHTS (FORCED REFRESH) ==========
router.post("/generate/monthly", auth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = month.split("-");

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const summaryData = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id), date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: "$category", totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1 } }
    ]);

    if (summaryData.length === 0) {
      return res.status(400).json({ success: false, message: "No expenses found for this month" });
    }

    const totalSpent = summaryData.reduce((sum, item) => sum + item.totalAmount, 0);
    const transactionCount = summaryData.reduce((sum, item) => sum + item.count, 0);
    const avgTransaction = totalSpent / transactionCount;
    const highestCategory = summaryData[0]._id;

    // ANTIHALLUCINATON GUARDRAIL
    if (transactionCount < 5) {
      // Clean up any old garbage insight first
      await Insight.deleteMany({ userId: req.user.id, month, type: "monthly_summary" });
      
      const insight = new Insight({
        userId: req.user.id, month, type: "monthly_summary",
        title: "Not Enough Data", 
        description: `You only have ${transactionCount} transaction(s) this month. Track a few more expenses (min 5) so that I can find meaningful patterns.`,
        insights: [
          {
            title: "Keep Tracking",
            description: "AI needs at least 5 transactions to establish a baseline.",
            recommendation: "Log your daily coffee, travel, and meals.",
            confidence: 1
          }
        ], 
        metadata: { totalSpent, transactionCount, avgTransaction, highestCategory },
        isAcknowledged: false,
        expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      
      await insight.save();
      
      return res.json({
        success: true,
        insight,
        source: "guardrail"
      });
    }

    const categoryBreakdown = summaryData.map(cat => `${cat._id}: ₹${Math.round(cat.totalAmount)} (${cat.count} transactions)`).join("\n");

    const prompt = `You are a financial advisor. Analyze this spending data for ${month} and provide 3-4 specific, actionable insights.

SPENDING DATA:
Total Spent: ₹${Math.round(totalSpent)}
Total Transactions: ${transactionCount}
Average Transaction: ₹${Math.round(avgTransaction)}

BREAKDOWN BY CATEGORY:
${categoryBreakdown}

TASK: 
1. Identify trends (what's changed from normal)
2. Highlight concerns (overspending, unusual patterns)
3. Suggest savings (specific actions they can take)
4. Acknowledge good behavior

CRITICAL: Reply ONLY with valid JSON.
{
  "summaryMessage": "Brief 1-2 sentence overview",
  "insights": [{"title": "...", "description": "...", "recommendation": "...", "confidence": 0.92}]
}`;

    const message = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-20b",
      max_tokens: 1500,
      temperature: 0.2
    });

    let jsonText = message.choices[0].message.content.trim();
    if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/```json\n?/g, "").replace(/```/g, "");
    else if (jsonText.startsWith("```")) jsonText = jsonText.replace(/```\n?/g, "");

    let analysis;
    try {
      analysis = JSON.parse(jsonText.trim());
    } catch (parseError) {
      return res.status(502).json({ success: false, message: "AI returned invalid response." });
    }

    //  DELETE THE OLD CACHED INSIGHT BEFORE SAVING THE NEW ONE
    await Insight.deleteMany({ userId: req.user.id, month, type: "monthly_summary" });

    const insight = new Insight({
      userId: req.user.id, month, type: "monthly_summary",
      title: "Monthly Spending Summary", description: analysis.summaryMessage,
      insights: analysis.insights, metadata: { totalSpent, transactionCount, avgTransaction, highestCategory },
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    await insight.save();

    res.json({ success: true, message: "Monthly insights generated", insight, source: "groq" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to generate insights" });
  }
});

// ========== GET MONTHLY INSIGHTS ==========
router.get("/monthly", auth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const insight = await Insight.findOne({ userId: req.user.id, month, type: "monthly_summary" }).sort({ createdAt: -1 });

    if (!insight) return res.status(404).json({ success: false, message: "No insights for this month." });
    res.json({ success: true, insight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ACKNOWLEDGE INSIGHT ==========
router.put("/:id/acknowledge", auth, async (req, res) => {
  try {
    const insight = await Insight.findOne({ _id: req.params.id, userId: req.user.id });
    if (!insight) return res.status(404).json({ success: false, message: "Insight not found" });

    insight.isAcknowledged = true;
    insight.acknowledgedAt = new Date();
    await insight.save();
    res.json({ success: true, message: "Insight acknowledged", insight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;