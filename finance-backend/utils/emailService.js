const nodemailer = require("nodemailer");

const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
  : null;

async function sendEmail(to, subject, html) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: `"FinSight" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`mail sent: ${subject} → ${to}`);
  } catch (error) {
    console.error(`mail failed: ${error.message}`);
  }
}

async function sendBudgetAlert(userEmail, userName, category, percentage, spent, limit) {
  const isOver = percentage >= 100;
  const color = isOver ? "#EF4444" : "#F59E0B";
  const emoji = isOver ? "🚨" : "⚠️";
  const subject = `${emoji} Budget Alert: ${category} at ${percentage}%`;

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0F172A; padding: 20px; color: #F8FAFC;">
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 16px; padding: 32px;">
        <h2 style="color: #F8FAFC; text-align: center;">${emoji} Budget Alert</h2>
        <p style="color: #94A3B8; text-align: center;">Hi ${userName}, your ${category} budget needs attention.</p>
        <div style="background: #020617; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #1F2937;">
          <p style="margin: 0 0 10px; color: #94A3B8;">Spent: <span style="color: #F8FAFC; float: right; font-weight: bold;">₹${spent.toFixed(0)}</span></p>
          <p style="margin: 0 0 15px; color: #94A3B8;">Limit: <span style="color: #F8FAFC; float: right; font-weight: bold;">₹${limit.toFixed(0)}</span></p>
          <p style="color: ${color}; text-align: center; font-weight: bold; font-size: 18px; margin: 0;">${percentage}% Used</p>
        </div>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, html);
}

async function sendAnomalyAlert(userEmail, userName, description, amount, anomalyScore, category) {
  const subject = `🚨 Unusual Transaction Detected - ₹${amount}`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0F172A; padding: 20px; color: #F8FAFC;">
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 16px; padding: 32px;">
        <h2 style="color: #F8FAFC; text-align: center;">🚨 Unusual Transaction</h2>
        <p style="color: #94A3B8; text-align: center;">Hi ${userName}, we flagged a transaction that looks unusual.</p>
        <div style="background: #020617; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #1F2937;">
          <p style="margin: 0 0 10px; color: #94A3B8;">Transaction: <strong style="color: #F8FAFC; float: right;">${description}</strong></p>
          <p style="margin: 0 0 10px; color: #94A3B8;">Amount: <strong style="color: #EF4444; float: right;">₹${amount}</strong></p>
          <p style="margin: 0; color: #94A3B8;">Anomaly Score: <strong style="color: #EF4444; float: right;">${anomalyScore}%</strong></p>
        </div>
        <p style="text-align: center; color: #94A3B8;">Please log in to review this transaction.</p>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, html);
}

async function sendMonthlyReport(userEmail, userName, month, totalSpent, topCategory, transactionCount) {
  const subject = `📊 Your ${month} Financial Report is Ready`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0F172A; padding: 20px; color: #F8FAFC;">
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 16px; padding: 32px;">
        <h2 style="color: #F8FAFC; text-align: center;">📊 ${month} Summary</h2>
        <p style="color: #94A3B8; text-align: center;">Hi ${userName}, your monthly financial report is ready.</p>
        <div style="background: #020617; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #1F2937;">
          <p style="margin: 0 0 10px; color: #94A3B8;">Total Spent: <strong style="color: #F8FAFC; float: right;">₹${totalSpent.toFixed(0)}</strong></p>
          <p style="margin: 0 0 10px; color: #94A3B8;">Transactions: <strong style="color: #F8FAFC; float: right;">${transactionCount}</strong></p>
          <p style="margin: 0; color: #94A3B8;">Top Category: <strong style="color: #10B981; float: right;">${topCategory}</strong></p>
        </div>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, html);
}

module.exports = { sendBudgetAlert, sendAnomalyAlert, sendMonthlyReport };