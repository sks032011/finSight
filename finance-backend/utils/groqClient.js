const { Groq } = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// inmemory cache for categorizns
const categoryCache = new Map();

// ytrackin API usage for monitoring
let apiCallsToday = 0;
let lastResetDate = new Date().toDateString();//to reset api call countr for today

// ========== CACHE MANAGEMENT ==========

function resetDailyStats() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    apiCallsToday = 0;
    lastResetDate = today;
  }
}

function getCacheKey(description) {
  return description.toLowerCase().trim();//swiggy=SWIGGY=SwigGY
}

function getCachedCategory(description) {
  const key = getCacheKey(description);
  return categoryCache.get(key);//cache lookup or else return undefined
}

function setCategoryCache(description, category, confidence) {
  const key = getCacheKey(description);
  categoryCache.set(key, { category, confidence});
}

// ========== MAIN CATEGORIZATION FUNCTION ==========

async function categorizeExpense(description) {
  resetDailyStats();

  // Check cache first
  const cached = getCachedCategory(description);
  if (cached) {
    console.log(`Cache hit for: "${description}" → ${cached.category}`);
    return {
      category: cached.category,
      confidence: cached.confidence,
      source: "cache"
    };
  }

  try {
    console.log(`Calling Groq for: "${description}"`);

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Categorize this expense description into ONE category. Reply ONLY with JSON (no markdown, no text).
          
Description: "${description}"

Available categories: Food, Travel, Entertainment, Shopping, Healthcare, Work, Bills, Utilities, Other

Reply with ONLY this JSON (no markdown, no extra text):
{"category":"...", "confidence": 0.95}
          `
        }
      ],
      model: "openai/gpt-oss-20b",
      max_tokens: 50,
      temperature: 0 // Deterministic
    });

    const responseText = message.choices[0].message.content.trim();
    
    // removin markdown if present
    let jsonText = responseText;
    if (responseText.startsWith("```json")) {
      jsonText = responseText.replace(/```json\n?/g, "").replace(/```/g, "");
    } else if (responseText.startsWith("```")) {
      jsonText = responseText.replace(/```\n?/g, "");
    }
    
    const result = JSON.parse(jsonText.trim());//string to obj..now i can res.category stuff

    // Validate category
    const validCategories = ["Food", "Travel", "Entertainment", "Shopping", "Healthcare", "Work", "Bills", "Utilities", "Other"];
    if (!validCategories.includes(result.category)) {
      result.category = "Other";//say it returns groceries so mark it others
    }

    // Ensure confidence is valid
    if (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.8;
    }

    // Cache it
    setCategoryCache(description, result.category, result.confidence);
    apiCallsToday++;


    return {
      category: result.category,
      confidence: result.confidence,
      source: "groq"
    };
  } catch (error) {
    console.error("Groq error:", error.message);

    // fallback 1: Check partial cache (if "Swiggy" is in cache, use it)
    const fallbackCategory = fallbackCategorization(description);
    if (fallbackCategory) {
      console.log(`Fallback (rules): "${description}" → ${fallbackCategory}`);
      return {
        category: fallbackCategory,
        confidence: 0.6,
        source: "fallback_rules"
      };
    }
// say randomxyzstore
    // Fallb 2: Return "Other" and ask user to categorize manually
    console.log(` fallback (manual): "${description}" → Other`);
    return {
      category: "Other",
      confidence: 0,
      source: "fallback_manual",
      requiresManualReview: true,
      error: error.message
    };
  }
}

// ========== FALLBACK: RULE-BASED CATEGORIZATION ==========

function fallbackCategorization(description) {
  const desc = description.toLowerCase();

  // Food
  if (desc.includes("swiggy") || desc.includes("zomato") || desc.includes("food") || 
      desc.includes("restaurant") || desc.includes("coffee") || desc.includes("pizza") ||
      desc.includes("burger") || desc.includes("meal") || desc.includes("lunch") || 
      desc.includes("breakfast") || desc.includes("dinner")) {
    return "Food";
  }

  // Travel
  if (desc.includes("uber") || desc.includes("ola") || desc.includes("taxi") || 
      desc.includes("flight") || desc.includes("train") || desc.includes("hotel") ||
      desc.includes("bus") || desc.includes("travel") || desc.includes("petrol") ||
      desc.includes("gas") || desc.includes("parking")) {
    return "Travel";
  }

  // Entertainment
  if (desc.includes("netflix") || desc.includes("movie") || desc.includes("game") ||
      desc.includes("spotify") || desc.includes("prime") || desc.includes("music") ||
      desc.includes("concert") || desc.includes("ticket") || desc.includes("entertainment")) {
    return "Entertainment";
  }

  // Shopping
  if (desc.includes("amazon") || desc.includes("flipkart") || desc.includes("shop") ||
      desc.includes("mall") || desc.includes("clothes") || desc.includes("dress") ||
      desc.includes("shirt") || desc.includes("shoes") || desc.includes("store")) {
    return "Shopping";
  }

  // Healthcare
  if (desc.includes("doctor") || desc.includes("hospital") || desc.includes("medicine") ||
      desc.includes("pharmacy") || desc.includes("health") || desc.includes("dental") ||
      desc.includes("clinic")) {
    return "Healthcare";
  }

  // Work
  if (desc.includes("office") || desc.includes("work") || desc.includes("project") ||
      desc.includes("client") || desc.includes("meeting")) {
    return "Work";
  }

  // Bills
  if (desc.includes("electricity") || desc.includes("water") || desc.includes("internet") ||
      desc.includes("phone") || desc.includes("bill") || desc.includes("rent")) {
    return "Bills";
  }

  return null; // No fallback found
}

// ========== BATCH CATEGORIZATION (for CSV imports) ==========

async function categorizeBatch(descriptions) {
  const CHUNK_SIZE = 25;
  const allResults = [];
  const validCategories = ["Food", "Travel", "Entertainment", "Shopping", "Healthcare", "Work", "Bills", "Utilities", "Other"];

  for (let i = 0; i < descriptions.length; i += CHUNK_SIZE) {
    const chunk = descriptions.slice(i, i + CHUNK_SIZE);
    
    try {
      const message = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Categorize the following JSON array of expense descriptions. 
            Available categories: Food, Travel, Entertainment, Shopping, Healthcare, Work, Bills, Utilities, Other.
            
            Input: ${JSON.stringify(chunk)}
            
            Reply ONLY with a strictly valid JSON array of objects in this exact format, in the same order as the input:
            [{"category": "Food", "confidence": 0.95}, {"category": "Other", "confidence": 0.80}]`
          }
        ],
        model: "openai/gpt-oss-20b",
        max_tokens: 1500,
        temperature: 0
      });

      let jsonText = message.choices[0].message.content.trim();
      
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      const parsedChunk = JSON.parse(jsonText);
      
      // ALIGNMENT GUARDRAIL: 
      chunk.forEach((desc, index) => {
        const llmResult = parsedChunk[index];

        // If the LLM provided a valid result for this exact index, use it
        if (llmResult && llmResult.category) {
          const finalCategory = validCategories.includes(llmResult.category) ? llmResult.category : "Other";
          const finalConfidence = typeof llmResult.confidence === 'number' ? llmResult.confidence : 0.8;
          
          allResults.push({ category: finalCategory, confidence: finalConfidence });
          setCategoryCache(desc, finalCategory, finalConfidence);
        } else {
          // The LLM dropped this index or returned garbage. Trigger fallback safely.
          console.warn(`LLM misalignment at chunk index ${index} for: "${desc}". Using fallback.`);
          const fallback = fallbackCategorization(desc);
          allResults.push({
            category: fallback || "Other",
            confidence: fallback ? 0.6 : 0
          });
        }
      });
      
      apiCallsToday++;
      
    } catch (error) {
      console.error("Batch Groq error:", error.message);
      // LLM crashed completely or returned totally invalid JSON
      chunk.forEach(desc => {
        const fallback = fallbackCategorization(desc);
        allResults.push({//entire chunk uses manual rule engine
          category: fallback || "Other",
          confidence: fallback ? 0.6 : 0
        });
      });
    }
  }

  return allResults;
}


function getAPIStats() {
  return {
    apiCallsToday,
    cacheSize: categoryCache.size,
    lastReset: lastResetDate
  };
}

function clearCache() {
  categoryCache.clear();
}

module.exports = {
  categorizeExpense,
  categorizeBatch,
  getAPIStats,
  clearCache,
  getCachedCategory
};