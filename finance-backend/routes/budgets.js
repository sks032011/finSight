const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");

const router = express.Router();

// ========== CREATE BUDGET ==========

router.post("/", auth, async (req, res) => {
  try {
    const { category, limit, notes } = req.body;

    if (!category || !limit) {
      return res.status(400).json({
        success: false,
        message: "Category and limit are required"
      });
    }

    const month = new Date().toISOString().slice(0, 7);

    // Check if budget already exists
    const existing = await Budget.findOne({
      userId: req.user.id,
      category: String(category),
      month
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Budget for ${category} already exists this month`
      });
    }

    const budget = new Budget({
      userId: req.user.id,
      category: String(category),
      limit: parseFloat(limit),
      month,
      notes: notes || "",
      alerts: [
        { threshold: 25, triggered: false },
        { threshold: 50, triggered: false },
        { threshold: 75, triggered: false },
        { threshold: 90, triggered: false },
        { threshold: 100, triggered: false }
      ]
    });

    await budget.save();

    res.status(201).json({
      success: true,
      message: "Budget created",
      budget
    });
  } catch (error) {
    console.error("Create budget error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create budget"
    });
  }
});

// ========== GET BUDGETS FOR CURRENT MONTH ==========

router.get("/", auth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const budgets = await Budget.find({
      userId: req.user.id,
      month
    }).sort({ category: 1 });

    // Get actual spending for each category
    const [year, monthNum] = month.split("-");
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const spending = await Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const spendingMap = {};
    spending.forEach(s => {
      spendingMap[s._id] = s.total;
    });

    // Calculate status for each budget
    const budgetsWithStatus = budgets.map(b => {
      const spent = spendingMap[b.category] || 0;
      const percentage = (spent / b.limit) * 100;

      return {
        ...b.toObject(),
        spent,
        percentage: Math.round(percentage),
        status: percentage > 100 ? "over" : percentage > 75 ? "warning" : "on-track",
        remaining: Math.max(0, b.limit - spent)
      };
    });

    res.json({
      success: true,
      month,
      budgets: budgetsWithStatus
    });
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch budgets"
    });
  }
});

// ========== UPDATE BUDGET ==========

router.put("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID"
      });
    }

    const { limit, notes } = req.body;

    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found"
      });
    }

    if (limit !== undefined) {
      budget.limit = parseFloat(limit);
    }
    if (notes !== undefined) {
      budget.notes = String(notes);
    }

    await budget.save();

    res.json({
      success: true,
      message: "Budget updated",
      budget
    });
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update budget"
    });
  }
});

// ========== DELETE BUDGET ==========

router.delete("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID"
      });
    }

    const result = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Budget not found"
      });
    }

    res.json({
      success: true,
      message: "Budget deleted"
    });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete budget"
    });
  }
});

// ========== GET BUDGET ALERTS ==========

router.get("/alerts/month", auth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const budgets = await Budget.find({
      userId: req.user.id,
      month,
      "alerts.triggered": true
    });

    const alerts = [];
    budgets.forEach(b => {
      b.alerts.forEach(alert => {
        if (alert.triggered) {
          alerts.push({
            category: b.category,
            threshold: alert.threshold,
            spent: b.spent,
            limit: b.limit,
            triggeredAt: alert.triggeredAt
          });
        }
      });
    });

    res.json({
      success: true,
      alerts: alerts.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch alerts"
    });
  }
});

module.exports = router;