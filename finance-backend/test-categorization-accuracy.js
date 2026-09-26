// test-categorization-accuracy.js
//
// Measures real-world accuracy of the LLM-powered categorization pipeline
// (Groq API + structured JSON prompting + confidence scoring + deterministic
// fallback) against a hand-labeled set of realistic expense descriptions.
//
// USAGE:
//   1. Drop this file into your finance-backend/ project root (same level as server.js)
//   2. Make sure your .env has GROQ_API_KEY set
//   3. Run: node test-categorization-accuracy.js
//
// No MongoDB connection needed — categorizeExpense() doesn't touch the DB.

require("dotenv").config();
const { categorizeExpense, clearCache } = require("./utils/groqClient");

// Ground-truth labeled test set — realistic Indian expense descriptions
const testCases = [
  { description: "Swiggy order - Domino's Pizza", expected: "Food" },
  { description: "Zomato dinner order", expected: "Food" },
  { description: "Starbucks coffee", expected: "Food" },
  { description: "Chai and samosa at local stall", expected: "Food" },
  { description: "Uber ride to airport", expected: "Travel" },
  { description: "Ola cab to office", expected: "Travel" },
  { description: "IndiGo flight ticket to Mumbai", expected: "Travel" },
  { description: "Petrol at HP pump", expected: "Travel" },
  { description: "IRCTC train ticket booking", expected: "Travel" },
  { description: "Netflix monthly subscription", expected: "Entertainment" },
  { description: "Movie tickets - PVR", expected: "Entertainment" },
  { description: "Spotify premium renewal", expected: "Entertainment" },
  { description: "PVR popcorn and snacks combo", expected: "Entertainment" },
  { description: "Amazon order - wireless mouse", expected: "Shopping" },
  { description: "Flipkart - running shoes", expected: "Shopping" },
  { description: "H&M shirt purchase", expected: "Shopping" },
  { description: "Grocery shopping at DMart", expected: "Shopping" },
  { description: "Apollo Pharmacy medicines", expected: "Healthcare" },
  { description: "Dentist appointment fee", expected: "Healthcare" },
  { description: "Blood test at diagnostic lab", expected: "Healthcare" },
  { description: "Gym membership renewal", expected: "Healthcare" },
  { description: "Electricity bill payment", expected: "Utilities" },
  { description: "Airtel broadband recharge", expected: "Utilities" },
  { description: "Monthly house rent", expected: "Bills" },
  { description: "Water bill payment", expected: "Utilities" },
  { description: "Notebook and pen purchase for office", expected: "Work" },
  { description: "Client dinner meeting", expected: "Food" },
  { description: "Freelance project software license", expected: "Work" },
  { description: "Random payment to XYZ12345", expected: "Other" },
  { description: "Cash withdrawal ATM", expected: "Other" },

  { description: "Domino's pizza late night order", expected: "Food" },
  { description: "Breakfast at local dhaba", expected: "Food" },
  { description: "Ice cream treat at Naturals", expected: "Food" },
  { description: "Birthday cake order", expected: "Food" },
  { description: "Office cafeteria lunch", expected: "Food" },
  { description: "Street food chaat", expected: "Food" },
  { description: "Bus ticket to hometown", expected: "Travel" },
  { description: "Metro card recharge", expected: "Travel" },
  { description: "Parking fee at airport", expected: "Travel" },
  { description: "Car service and maintenance", expected: "Travel" },
  { description: "Rapido bike ride", expected: "Travel" },
  { description: "Toll plaza payment", expected: "Travel" },
  { description: "Amazon Prime Video subscription", expected: "Entertainment" },
  { description: "Bowling alley outing", expected: "Entertainment" },
  { description: "Comic book purchase", expected: "Entertainment" },
  { description: "Gaming console accessory", expected: "Entertainment" },
  { description: "Standup comedy show ticket", expected: "Entertainment" },
  { description: "Myntra - winter jacket", expected: "Shopping" },
  { description: "Local tailor stitching charges", expected: "Shopping" },
  { description: "New mobile phone cover", expected: "Shopping" },
  { description: "Bought a backpack for college", expected: "Shopping" },
  { description: "Diwali decoration items", expected: "Shopping" },
  { description: "Sunglasses from mall kiosk", expected: "Shopping" },
  { description: "Skincare products online order", expected: "Shopping" },
  { description: "Eye drops from pharmacy", expected: "Healthcare" },
  { description: "Annual health checkup package", expected: "Healthcare" },
  { description: "Orthopedic consultation", expected: "Healthcare" },
  { description: "Protein supplement purchase", expected: "Food" },
  { description: "Vaccination charges", expected: "Healthcare" },
  { description: "Mobile postpaid bill payment", expected: "Bills" },
  { description: "DTH recharge for TV", expected: "Bills" },
  { description: "Broadband installation charge", expected: "Bills" },
  { description: "Society maintenance fee", expected: "Bills" },
  { description: "Gas cylinder booking", expected: "Utilities" },
  { description: "Credit card annual fee", expected: "Bills" },
  { description: "Insurance premium payment", expected: "Bills" },
  { description: "Cable TV subscription", expected: "Utilities" },
  { description: "Municipal property tax", expected: "Bills" },
  { description: "Solar panel maintenance", expected: "Utilities" },
  { description: "Internet router purchase", expected: "Utilities" },
  { description: "Printer cartridge for office", expected: "Work" },
  { description: "Business card printing", expected: "Work" },
  { description: "Zoom subscription for meetings", expected: "Work" },
  { description: "Coworking desk booking", expected: "Work" },
  { description: "LinkedIn premium subscription", expected: "Work" },
  { description: "Conference registration fee", expected: "Work" },
  { description: "Laptop repair for office use", expected: "Work" },
  { description: "Donation to NGO", expected: "Other" },
  { description: "Wedding gift contribution", expected: "Other" },
  { description: "Lottery ticket purchase", expected: "Other" },
  { description: "Lent money to a friend", expected: "Other" },
  { description: "Bank service charge", expected: "Other" },
  { description: "Miscellaneous UPI transfer", expected: "Other" },
  { description: "ATM withdrawal charges", expected: "Other" },
  { description: "Refund adjustment entry", expected: "Other" },
  { description: "Swiggy Instamart grocery order", expected: "Food" },
  { description: "Late night Zomato snack", expected: "Food" },
  { description: "Ola auto to railway station", expected: "Travel" },
  { description: "Flight cancellation fee", expected: "Travel" },
  { description: "BookMyShow movie tickets", expected: "Entertainment" },
  { description: "PlayStation game purchase", expected: "Entertainment" },
  { description: "Nykaa cosmetics order", expected: "Shopping" },
  { description: "Decathlon sports shoes", expected: "Shopping" },
  { description: "Dermatologist visit fee", expected: "Healthcare" },
  { description: "Physiotherapy session charges", expected: "Healthcare" },
  { description: "Electricity bill for June", expected: "Utilities" },
  { description: "Wifi bill payment", expected: "Utilities" },
  { description: "Office stationery bulk order", expected: "Work" },
  { description: "Charity fund contribution", expected: "Other" },
  { description: "Cash deposit at ATM", expected: "Other" },
];
async function runAccuracyTest() {
  clearCache(); // start clean so results reflect real classification, not stale cache
  let correct = 0;
  const sourceBreakdown = {};
  const misclassified = [];

  for (const { description, expected } of testCases) {
    const result = await categorizeExpense(description);
    const isCorrect = result.category === expected;
    if (isCorrect) correct++;
    else misclassified.push({ description, expected, got: result.category, confidence: result.confidence, source: result.source });

    sourceBreakdown[result.source] = (sourceBreakdown[result.source] || 0) + 1;

    console.log(
      `${isCorrect ? "PASS" : "FAIL"}  "${description}" -> ${result.category} ` +
      `(expected ${expected}, confidence ${result.confidence}, source ${result.source})`
    );

    // small delay so we don't hammer the free-tier rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  const accuracy = ((correct / testCases.length) * 100).toFixed(1);

  console.log("\n===== RESULTS =====");
  console.log(`Accuracy: ${correct}/${testCases.length} (${accuracy}%)`);
  console.log("Source breakdown:", sourceBreakdown);
  if (misclassified.length) {
    console.log("\nMisclassified:");
    misclassified.forEach((m) =>
      console.log(`  "${m.description}" -> got ${m.got}, expected ${m.expected} (source: ${m.source})`)
    );
  }
}

runAccuracyTest().catch(console.error);