// routes/expenses.js
const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Budget = require("../models/Budget"); //for budget cross check
const User = require("../models/User"); //to get email for sendimg alert
const {
  categorizeExpense,
  categorizeBatch,
  getAPIStats,
} = require("../utils/groqClient");
const { checkAndCreateAnomaly } = require("../utils/anomalyDetector");
const { sendBudgetAlert } = require("../utils/emailService");

const router = express.Router();

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, //1 mmin
  max: 100, //max 100 req p m
  keyGenerator: (req) => req.user.id, //id used to limit per logged in user..multi users can share same ip(wifi) user based limiting is fairer
  message: "Too many requests. Please try again later.",
});

const groqLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 500, //500 calls a day
  keyGenerator: (req) => req.user.id,
  message: "Daily AI quota exceeded. Try again tomorrow.",
});

// ========== ADD EXPENSE ==========

router.post("/", auth, apiLimiter, groqLimiter, async (req, res) => {
  try {
    const {
      amount,
      description,
      date,
      tags,
      notes,
      isRecurring,
      recurringFrequency,
    } = req.body;

    if (!amount || !description)
      return res
        .status(400)
        .json({
          success: false,
          message: "Amount and description are required",
        });
    if (amount < 0 || amount > 1000000)
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    if (description.length < 2 || description.length > 500)
      return res
        .status(400)
        .json({
          success: false,
          message: "Description must be 2-500 characters",
        });

    const categorization = await categorizeExpense(description);

    const expense = new Expense({
      userId: req.user.id,
      amount,
      description,
      category: categorization.category,
      aiConfidence: categorization.confidence,
      isCategorizedByAI: categorization.source !== "fallback_manual",
      date: date ? new Date(date) : new Date(),
      tags: tags || [],
      notes,
      isRecurring: isRecurring || false,
      recurringFrequency: isRecurring ? recurringFrequency : null,
      originalDescription: description,
    });

    await expense.save();

    // anomaly detection
    await checkAndCreateAnomaly(req.user.id, expense);

    // budget check (non-blocking)
    (async () => {
      //immediate invoke
      try {//2026-07-01T15:20:40.000Z to 2026-07
        const currentMonth = new Date().toISOString().slice(0, 7);
        const budget = await Budget.findOne({
          userId: req.user.id,
          category: expense.category,
          month: currentMonth,
        });

        if (budget) {
          const [year, monthNum] = currentMonth.split("-");
          const startDate = new Date(year, monthNum - 1, 1);
          const endDate = new Date(year, monthNum, 1);

          const spendingResult = await Expense.aggregate([
            {
              $match: {
                userId: new mongoose.Types.ObjectId(req.user.id),
                category: expense.category,
                date: { $gte: startDate, $lt: endDate },
              },
            },
            //now part 2 add them up
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]);

          const totalSpent = spendingResult[0]?.total || 0;

          // Calculate what the percentage was BEFORE this expense
          const oldTotal = totalSpent - expense.amount;//like 8300(new)-500=7800 old expense
          const oldPercentage = (oldTotal / budget.limit) * 100;
          const newPercentage = (totalSpent / budget.limit) * 100;
          
          // Did this exact transaction push us over 80%?
          const crossed80 = oldPercentage < 80 && newPercentage >= 80;
          // Did this exact transaction push us over 100%?
          const crossed100 = oldPercentage < 100 && newPercentage >= 100;

          if (crossed80 || crossed100) {
            const user = await User.findById(req.user.id).select(
              "email name settings",//get only these and not whole doc
            );
            if (user?.settings?.emailAlerts !== false) {
              const alertPercent = crossed100 ? 100 : 80;
              sendBudgetAlert(
                user.email,
                user.name,
                expense.category,
                alertPercent,
                totalSpent,
                budget.limit,
              ).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Background budget check failed:", err.message);
      }
    })();

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      expense: {
        ...expense.toObject(),
        categorization: {
          source: categorization.source,
          confidence: categorization.confidence,
          requiresReview: categorization.requiresManualReview || false,
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to add expense",
      });
  }
});

// ========== GET ALL EXPENSES ==========

router.get("/", auth, apiLimiter, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;
// createin the query 
    let query = { userId: req.user.id };
    if (req.query.category) query.category = String(req.query.category);
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) {
        const sd = new Date(String(req.query.startDate));
        if (!isNaN(sd)) query.date.$gte = sd;
      }
      if (req.query.endDate) {
        const ed = new Date(String(req.query.endDate));
        if (!isNaN(ed)) query.date.$lte = ed;
      }
    }
    if (req.query.minAmount || req.query.maxAmount) {
      query.amount = {};
      if (req.query.minAmount) {
        const min = parseFloat(String(req.query.minAmount));
        if (!isNaN(min) && min >= 0) query.amount.$gte = min;
      }
      if (req.query.maxAmount) {
        const max = parseFloat(String(req.query.maxAmount));
        if (!isNaN(max) && max >= 0) query.amount.$lte = max;
      }
    }
    if (req.query.tags) query.tags = { $in: [String(req.query.tags)] };

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();//return plain js obj not full mong. doc instances

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
      expenses,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to fetch expenses",
      });
  }
});

// ========== GET SINGLE EXPENSE ==========

router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid expense ID" });

    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    res.json({ success: true, expense });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to fetch expense",
      });
  }
});

// ========== UPDATE EXPENSE ==========

router.put("/:id", auth, apiLimiter, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid expense ID" });

    const { amount, description, category, date, tags, notes } = req.body;

    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (numAmount > 0 && numAmount <= 1000000) expense.amount = numAmount;
    }
    if (description !== undefined) {
      if (description.length >= 2 && description.length <= 500) {
        expense.description = String(description);
        expense.isEdited = true;
      }
    }
    if (category !== undefined) {
      const validCategories = [
        "Food",
        "Travel",
        "Entertainment",
        "Shopping",
        "Healthcare",
        "Work",
        "Bills",
        "Utilities",
        "Other",
      ];
      if (validCategories.includes(String(category))) {
        expense.category = String(category);
      }
    }
    if (date !== undefined) {
      const newDate = new Date(String(date));
      if (!isNaN(newDate)) expense.date = newDate;
    }
    if (tags !== undefined && Array.isArray(tags))
      expense.tags = tags.map((t) => String(t));
    if (notes !== undefined) expense.notes = String(notes);

    await expense.save();

    // Re-run anomaly if core metrics changed
    if (amount !== undefined || category !== undefined) {
      await checkAndCreateAnomaly(req.user.id, expense);
    }

    res.json({ success: true, message: "Expense updated", expense });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to update expense",
      });
  }
});

// ========== DELETE EXPENSE ==========

router.delete("/:id", auth, apiLimiter, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid expense ID" });

    const result = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!result)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    res.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to delete expense",
      });
  }
});

// ========== CSV IMPORT ==========

router.post("/import/csv", auth, groqLimiter, async (req, res) => {
  try {
    const { expenses } = req.body;
    
    if (!Array.isArray(expenses) || expenses.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid CSV data" });
    if (expenses.length > 100)//limits 100 rows/ records only
      return res
        .status(400)
        .json({ success: false, message: "Maximum 100 expenses per import" });

  
        const validExpenses = expenses
  .filter((e) => {
    const amt = parseFloat(e.amount);
    return amt > 0 && String(e.description).length >= 2 && e.date;
  })
  .map((e) => ({
    amount: parseFloat(e.amount),
    description: String(e.description).trim(),
    date: new Date(String(e.date).trim()),
  }));

    if (validExpenses.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No valid expenses in CSV" });

    const descriptions = validExpenses.map((e) => e.description);
    const categorizations = await categorizeBatch(descriptions);

    const expensesToInsert = validExpenses.map((expenseData, i) => ({
      userId: new mongoose.Types.ObjectId(req.user.id),
      amount: expenseData.amount,
      description: expenseData.description,
      category: categorizations[i].category,
      aiConfidence: categorizations[i].confidence,
      isCategorizedByAI: true,
      date: expenseData.date,
      source: "csv_import",
    }));

    let importedCount = 0;
    try {
      const result = await Expense.insertMany(expensesToInsert, {
        ordered: false,
      });
      importedCount = result.length;
    } catch (dbError) {
      importedCount = dbError.insertedDocs ? dbError.insertedDocs.length : 0;
    }

    res.json({
      success: true,
      message: `Imported ${importedCount} expenses`,
      imported: importedCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to import CSV",
      });
  }
});
//DASHBOARD ANALYTICS 
// ========== MONTHLY SUMMARY ==========

router.get("/summary/monthly", auth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = month.split("-");
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const summaryData = await Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const totalSpent = summaryData.reduce(
      (sum, item) => sum + item.totalAmount,
      0,
    );
    const transactionCount = summaryData.reduce(
      (sum, item) => sum + item.count,
      0,
    );
    const byCategory = summaryData.map((item) => ({
      category: item._id,
      amount: item.totalAmount,
      count: item.count,
      percentage:
        totalSpent > 0 ? Math.round((item.totalAmount / totalSpent) * 100) : 0,
    }));

    res.json({
      success: true,
      month,
      totalSpent,
      transactionCount,
      byCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to get summary",
      });
  }
});


module.exports = router;
