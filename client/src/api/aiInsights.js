import api from "./axios";

export const getExpenseInsights = async () => {
  try {
    const response = await api.get("/ai-insights/expense-insights", {
      withCredentials: true,
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching expense insights:", error);
    throw error;
  }
};

export const getBehavioralAnalysis = async () => {
  try {
    console.log("hello")
    const response = await api.get("/ai-insights/behavioral-analysis", {
      withCredentials: true,
    });
    console.log(response)
    return response.data.data;
  } catch (error) {
    console.error("Error fetching behavioral analysis:", error);
    throw error;
  }
};

export const getSpendingCoach = async () => {
  try {
    const response = await api.get("/ai-insights/spending-coach", {
      withCredentials: true,
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching spending coach recommendations:", error);
    throw error;
  }
};
