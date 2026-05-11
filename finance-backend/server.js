require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const { Groq } = require("groq-sdk");

const app = express();

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== DATABASE CONNECTION ==========
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error(" MongoDB connection error:", err.message);
    process.exit(1);
  });

// ========== ROUTES ==========
app.use("/api/auth", require("./routes/auth"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api/insights", require("./routes/insights"));
app.use("/api/budgets", require("./routes/budgets"));
app.use("/api/anomalies", require("./routes/anomalies"));

// ========== CRON JOB ==========
// runs at midnight on 1st of every month
//  roll over budget ,generate insight , send monthly report email

cron.schedule("0 0 1 * *", async () => {
  console.log("Monthly cron job started...");

  try {
    const Budget = require("./models/Budget");
    const Insight = require("./models/Insight");
    const Expense = require("./models/Expense");
    const User = require("./models/User");
    const { sendMonthlyReport } = require("./utils/emailService");

    const users = await User.find().select("_id email name settings");

    for (const user of users) {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);

        // 1ROLL OVER BUDGETS
        const lastMonthBudgets = await Budget.find({
          userId: user._id,
          month: { $lt: currentMonth }
        });

        for (const budget of lastMonthBudgets) {
          const exists = await Budget.findOne({
            userId: user._id,
            category: budget.category,
            month: currentMonth
          });

          if (!exists) {
            await new Budget({
              userId: user._id,
              category: budget.category,
              limit: budget.limit,
              month: currentMonth,
              notes: budget.notes,
              alerts: [
                { threshold: 25, triggered: false },
                { threshold: 50, triggered: false },
                { threshold: 75, triggered: false },
                { threshold: 90, triggered: false },
                { threshold: 100, triggered: false }
              ]
            }).save();
          }
        }

        // 2GET PREVIOUS MONTH DATA
        const prevMonth = new Date();
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        const prevMonthStr = prevMonth.toISOString().slice(0, 7);
        const [prevYear, prevMonthNum] = prevMonthStr.split("-");
        const prevStart = new Date(prevYear, prevMonthNum - 1, 1);
        const prevEnd = new Date(prevYear, prevMonthNum, 1);

        const summaryData = await Expense.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(user._id),
              date: { $gte: prevStart, $lt: prevEnd }
            }
          },
          { $group: { _id: "$category", totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } },
          { $sort: { totalAmount: -1 } }
        ]);

        // skip users with no activity last month
        if (summaryData.length === 0) continue;

        const totalSpent = summaryData.reduce((sum, item) => sum + item.totalAmount, 0);
        const transactionCount = summaryData.reduce((sum, item) => sum + item.count, 0);
        const avgTransaction = totalSpent / transactionCount;
        const highestCategory = summaryData[0]._id;

        // 3️ GENERATE MONTHLY INSIGHT (only if 5+ transactions)
        const existingInsight = await Insight.findOne({
          userId: user._id,
          month: prevMonthStr,
          type: "monthly_summary"
        });

        if (!existingInsight && transactionCount >= 5) {
          try {
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const categoryBreakdown = summaryData
              .map(cat => `${cat._id}: ₹${Math.round(cat.totalAmount)} (${cat.count} txns)`)
              .join("\n");

            const prompt = `You are a financial advisor. Analyze this spending for ${prevMonthStr} and provide 2-3 insights.
Total: ₹${Math.round(totalSpent)} | Transactions: ${transactionCount} | Avg: ₹${Math.round(avgTransaction)}
Breakdown:
${categoryBreakdown}

Reply ONLY with JSON: {"summaryMessage": "...", "insights": [{"title": "...", "description": "...", "recommendation": "...", "confidence": 0.9}]}`;

            const message = await groq.chat.completions.create({
              messages: [{ role: "user", content: prompt }],
              model: "llama-3.1-8b-instant",
              max_tokens: 1000,
              temperature: 0.2
            });

            let jsonText = message.choices[0].message.content.trim();
            if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/```json\n?/g, "").replace(/```/g, "");
            else if (jsonText.startsWith("```")) jsonText = jsonText.replace(/```\n?/g, "");

            let analysis;
            try {
              analysis = JSON.parse(jsonText);
            } catch (parseError) {
              console.error(`LLM JSON error for user ${user._id}`);
              analysis = { summaryMessage: "Your monthly report is ready.", insights: [] };
            }

            await new Insight({
              userId: user._id,
              month: prevMonthStr,
              type: "monthly_summary",
              title: "Monthly Spending Summary",
              description: analysis.summaryMessage,
              insights: analysis.insights || [],
              metadata: { totalSpent, transactionCount, avgTransaction, highestCategory },
              expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }).save();

            console.log(`Insight generated for user ${user._id}`);
          } catch (groqError) {
            console.error(`Groq failed for user ${user._id}:`, groqError.message);
          }
        }

        // 4️SEND MONTHLY REPORT EMAIL (fire-and-forget)
        if (user?.settings?.emailAlerts !== false) {
          sendMonthlyReport(
            user.email,
            user.name,
            prevMonthStr,
            totalSpent,
            highestCategory,
            transactionCount
          ).catch(console.error);
        }

      } catch (userError) {
        console.error(`Error for user ${user._id}:`, userError.message);
      }
    }

    console.log(" Monthly cron job completed");
  } catch (error) {
    console.error(" Cron job error:", error);
  }
});

console.log("Cron job scheduled: 1st of each month at midnight");

// ========== HEALTH CHECK ==========
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// ========== ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});