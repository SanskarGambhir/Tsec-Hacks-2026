import api from "./axios.js";

export const registerUser = (userData) => {
  return api.post("/api/v1/auth/register", userData);
};

export const loginUser = (credentials) => {
  return api.post("/api/v1/auth/login", credentials);
};

// export const logoutUser = () => {
//   return api.post("/api/v1/auth/logout");
// };