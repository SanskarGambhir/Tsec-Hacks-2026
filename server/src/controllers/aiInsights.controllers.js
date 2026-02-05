import { Group } from "../models/group.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Simple cache
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    console.log(`Cache hit for ${key}`);
    return item.data;
  }
  cache.delete(key);
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Get user's expense data
const getUserExpenseData = async (userId) => {
  const groups = await Group.find({
    $or: [{ owner: userId }, { members: userId }],
  }).select("expenses name").lean();

  let allExpenses = [];
  for (const group of groups) {
    if (group.expenses && Array.isArray(group.expenses)) {
      allExpenses = allExpenses.concat(group.expenses);
    }
  }
  return allExpenses;
};

// Get Expense Insights
const getExpenseInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const cacheKey = `insights-${userId}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Expense insights (cached)"));
  }

  try {
    const expenses = await getUserExpenseData(userId);

    if (!expenses || expenses.length === 0) {
      return res.status(200).json(
        new ApiResponse(200, {
          insights: "No expense data found yet. Start tracking expenses to see insights.",
          summary: { totalExpense: 0, avgExpense: 0, maxExpense: 0, minExpense: 0, transactionCount: 0, categories: [] }
        }, "No expense data")
      );
    }

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const avg = total / expenses.length;
    const byCategory = {};

    expenses.forEach((e) => {
      const cat = e.category || "General";
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += e.amount || 0;
      byCategory[cat].count += 1;
    });

    // Prepare data for Gemini
    const categoryBreakdown = Object.entries(byCategory)
      .map(([name, data]) => `${name}: $${data.total.toFixed(2)} (${data.count} transactions)`)
      .join("\n");

    const prompt = `Analyze this spending data and provide brief, actionable insights:

Total Spending: $${total.toFixed(2)}
Average Transaction: $${avg.toFixed(2)}
Number of Transactions: ${expenses.length}

Category Breakdown:
${categoryBreakdown}

Provide 3-4 key insights about their spending patterns. Keep it concise and practical.`;

    let insightText = "";
    try {
      const result = await model.generateContent(prompt);
      insightText = result.response.text();
    } catch (error) {
      console.warn("Gemini API error, using fallback:", error.message);
      insightText = `You have ${expenses.length} transactions totaling $${total.toFixed(2)}. Your average transaction is $${avg.toFixed(2)}. Main spending categories: ${Object.keys(byCategory).slice(0, 3).join(", ")}.`;
    }

    const response = {
      insights: insightText,
      summary: {
        totalExpense: total,
        avgExpense: avg,
        maxExpense: Math.max(...expenses.map(e => e.amount || 0)),
        minExpense: Math.min(...expenses.map(e => e.amount || 0)),
        transactionCount: expenses.length,
        categories: Object.entries(byCategory).map(([name, data]) => ({
          name,
          amount: data.total,
          count: data.count,
          percentage: ((data.total / total) * 100).toFixed(1)
        }))
      }
    };

    setCached(cacheKey, response);
    return res.status(200).json(new ApiResponse(200, response, "Expense insights"));
  } catch (error) {
    console.error("Error in getExpenseInsights:", error);
    throw new ApiError(500, "Failed to get expense insights");
  }
});

// Get Behavioral Analysis
const getBehavioralAnalysis = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const cacheKey = `behavioral-${userId}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Behavioral analysis (cached)"));
  }

  try {
    const expenses = await getUserExpenseData(userId);

    if (!expenses || expenses.length === 0) {
      return res.status(200).json(
        new ApiResponse(200, {
          analysis: "No spending data to analyze yet.",
          patterns: [],
          categoryBreakdown: []
        }, "No expense data")
      );
    }

    const byCategory = {};
    const byFrequency = {};
    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    expenses.forEach((e) => {
      const cat = e.category || "General";
      const desc = e.description || "Transaction";

      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += e.amount || 0;
      byCategory[cat].count += 1;

      if (!byFrequency[desc]) byFrequency[desc] = 0;
      byFrequency[desc] += 1;
    });

    const topItems = Object.entries(byFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([desc]) => desc)
      .join(", ");

    const prompt = `Analyze the spending behavior based on:
Top recurring items: ${topItems}
Total spending: $${total.toFixed(2)}
Number of transactions: ${expenses.length}

Provide brief insights about their spending patterns, habits, and behaviors. Keep it to 3-4 sentences.`;

    let analysisText = "";
    try {
      const result = await model.generateContent(prompt);
      analysisText = result.response.text();
    } catch (error) {
      console.warn("Gemini API error, using fallback:", error.message);
      analysisText = `Your top spending items are: ${topItems}. You have consistent transaction patterns with ${expenses.length} transactions. Consider tracking these recurring items to optimize spending.`;
    }

    const patterns = Object.entries(byFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([desc, freq]) => ({ description: desc, frequency: freq }));

    const response = {
      analysis: analysisText,
      patterns,
      categoryBreakdown: Object.entries(byCategory).map(([name, data]) => ({
        name,
        amount: data.total,
        count: data.count,
        percentage: ((data.total / total) * 100).toFixed(1)
      }))
    };

    setCached(cacheKey, response);
    return res.status(200).json(new ApiResponse(200, response, "Behavioral analysis"));
  } catch (error) {
    console.error("Error in getBehavioralAnalysis:", error);
    throw new ApiError(500, "Failed to get behavioral analysis");
  }
});

// Get Spending Coach
const getSpendingCoach = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const cacheKey = `coach-${userId}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Spending coach (cached)"));
  }

  try {
    const expenses = await getUserExpenseData(userId);

    if (!expenses || expenses.length === 0) {
      return res.status(200).json(
        new ApiResponse(200, {
          advice: "Start tracking expenses to get personalized spending recommendations.",
          recommendations: [],
          savingsOpportunities: [],
          totalCurrentSpend: 0,
          potentialMonthlySavings: 0
        }, "No expense data")
      );
    }

    const byCategory = {};
    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    expenses.forEach((e) => {
      const cat = e.category || "General";
      if (!byCategory[cat]) byCategory[cat] = 0;
      byCategory[cat] += e.amount || 0;
    });

    const sorted = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const categoryList = sorted
      .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
      .join(", ");

    const prompt = `You are a personal finance coach. Based on this spending data:

Total monthly spending: $${total.toFixed(2)}
Top categories: ${categoryList}

Provide 3-4 specific, actionable recommendations to reduce spending and save money. Be practical and encouraging.`;

    let adviceText = "";
    try {
      const result = await model.generateContent(prompt);
      adviceText = result.response.text();
    } catch (error) {
      console.warn("Gemini API error, using fallback:", error.message);
      adviceText = `Focus on reducing spending in: ${sorted.map(([cat]) => cat).join(", ")}. Consider 10% cuts in your top categories. Review subscriptions and recurring charges first.`;
    }

    const savings = sorted.map(([cat, amount]) => ({
      category: cat,
      currentSpend: amount,
      suggestedReduction: Math.round(amount * 0.1),
      potentialSavings: Math.round(amount * 0.1)
    }));

    const totalSavings = savings.reduce((sum, s) => sum + s.potentialSavings, 0);

    const response = {
      advice: adviceText,
      recommendations: sorted.map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: ((amount / total) * 100).toFixed(1)
      })),
      savingsOpportunities: savings,
      totalCurrentSpend: total,
      potentialMonthlySavings: totalSavings
    };

    setCached(cacheKey, response);
    return res.status(200).json(new ApiResponse(200, response, "Spending coach"));
  } catch (error) {
    console.error("Error in getSpendingCoach:", error);
    throw new ApiError(500, "Failed to get spending coach recommendations");
  }
});

export { getExpenseInsights, getBehavioralAnalysis, getSpendingCoach };
