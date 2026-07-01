import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Zap,
  DollarSign,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getExpenseInsights,
  getBehavioralAnalysis,
  getSpendingCoach,
} from "@/api/aiInsights.js";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#06b6d4"];

export default function AIInsights() {
  const [insights, setInsights] = useState(null);
  const [behavioral, setBehavioral] = useState(null);
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllInsights = async () => {
      try {
        setLoading(true);
        setError(null);

        const [insightsData, behavioralData, coachData] = await Promise.allSettled([
          getExpenseInsights(),
          getBehavioralAnalysis(),
          getSpendingCoach(),
        ]).then((results) => {
          const insights = results[0].status === "fulfilled" ? results[0].value : null;
          const behavioral = results[1].status === "fulfilled" ? results[1].value : null;
          const coach = results[2].status === "fulfilled" ? results[2].value : null;
          
          if (!insights || !behavioral || !coach) {
            const failed = [];
            if (!insights) failed.push("Expense Insights");
            if (!behavioral) failed.push("Behavioral Analysis");
            if (!coach) failed.push("Spending Coach");
            console.warn("Failed to load:", failed.join(", "));
          }
          
          return [insights, behavioral, coach];
        });

        setInsights(insightsData);
        setBehavioral(behavioralData);
        setCoach(coachData);
      } catch (err) {
        console.error("Error fetching AI insights:", err);
        setError("Failed to load AI insights. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllInsights();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            AI Insights & Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Powered by Gemini - Get personalized spending insights
          </p>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-destructive/10 border border-red-500/30 text-destructive"
        >
          {error}
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-yellow-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Analyzing your data</h3>
          <p className="text-muted-foreground">AI is processing your spending patterns...</p>
        </motion.div>
      )}

      {!loading && !error && (
        <>
          {/* Section 1: Expense Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Expense Insights</h2>
                <p className="text-muted-foreground">AI-powered analysis of your spending patterns</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Insights Text */}
              <Card className="border-border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300 leading-relaxed text-base">
                    {insights?.insights || "No insights available"}
                  </div>
                </CardContent>
              </Card>

              {/* Category Breakdown Chart */}
              {insights?.summary?.categories && insights.summary.categories.length > 0 && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Spending by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={insights.summary.categories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {insights.summary.categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Summary Stats */}
              {insights?.summary && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Total Spending</span>
                        <span className="font-bold text-lg">
                          ${insights.summary.totalExpense?.toFixed(2) || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Transactions</span>
                        <span className="font-bold">{insights.summary.transactionCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Average Spend</span>
                        <span className="font-bold">
                          ${insights.summary.avgExpense?.toFixed(2) || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Highest</span>
                        <span className="font-bold text-destructive">
                          ${insights.summary.maxExpense?.toFixed(2) || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Lowest</span>
                        <span className="font-bold text-primary">
                          ${insights.summary.minExpense?.toFixed(2) || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>

          {/* Section 2: Behavioral Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Behavioral Analysis</h2>
                <p className="text-muted-foreground">
                  Emotions & patterns behind your spending habits
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Analysis Text */}
              <Card className="border-border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-purple-400" />
                    Behavioral Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300 leading-relaxed text-base">
                    {behavioral?.analysis || "No analysis available"}
                  </div>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              {behavioral?.categoryBreakdown && behavioral.categoryBreakdown.length > 0 && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Spending Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={behavioral.categoryBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                          }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Bar dataKey="amount" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Top Patterns */}
              {behavioral?.patterns && behavioral.patterns.length > 0 && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Spending Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {behavioral.patterns.slice(0, 5).map((pattern, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border"
                        >
                          <span className="text-sm text-gray-300 font-medium">{pattern.description}</span>
                          <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                            {pattern.frequency}x
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>

          {/* Section 3: Spending Coach */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Spending Coach</h2>
                <p className="text-muted-foreground">Personalized recommendations to optimize your spending</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Advice Text */}
              <Card className="border-border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Personalized Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300 leading-relaxed text-base">
                    {coach?.advice || "No recommendations available"}
                  </div>
                </CardContent>
              </Card>

              {/* Savings Opportunities Chart */}
              {coach?.recommendations && coach.recommendations.length > 0 && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Spending Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={coach.recommendations}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="category" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                          }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Bar dataKey="amount" fill="#22c55e" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Potential Savings */}
              {coach?.savingsOpportunities && coach.savingsOpportunities.length > 0 && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-yellow-400" />
                      Potential Savings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {coach.savingsOpportunities.map((opp, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-3 bg-secondary rounded-lg border border-primary/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-primary">{opp.category}</span>
                          <Badge className="bg-primary/10 text-primary">
                            Save ${opp.potentialSavings.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Current: ${opp.currentSpend.toFixed(2)}</span>
                          <span>
                            Target: ₹{(opp.currentSpend - opp.potentialSavings).toFixed(2)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    {coach.potentialMonthlySavings > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg"
                      >
                        <p className="text-sm text-muted-foreground mb-1">Total Monthly Savings Potential</p>
                        <p className="text-2xl font-bold text-primary">
                          ${coach.potentialMonthlySavings.toFixed(2)}
                        </p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              {coach?.totalCurrentSpend && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                      Your Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                        <span className="text-muted-foreground">Current Monthly Spend</span>
                        <span className="font-bold text-lg">
                          ${coach.totalCurrentSpend.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <span className="text-primary">Potential Savings</span>
                        <span className="font-bold text-lg text-primary">
                          ${coach.potentialMonthlySavings.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                        <span className="text-blue-400 font-medium">New Target Spend</span>
                        <span className="font-bold text-xl text-blue-400">
                          ₹{(coach.totalCurrentSpend - coach.potentialMonthlySavings).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
