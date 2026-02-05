import api from "./axios";

export const getActivityFeed = async () => {
  try {
    const response = await api.get("/activity/feed", { withCredentials: true });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    throw error;
  }
};

export const getActivitiesByGroup = async (groupId) => {
  try {
    const response = await api.get(`/activity/group/${groupId}`, { withCredentials: true });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching group activities:", error);
    throw error;
  }
};

export const getActivityStats = async () => {
  try {
    const response = await api.get("/activity/stats", { withCredentials: true });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching activity stats:", error);
    throw error;
  }
};
