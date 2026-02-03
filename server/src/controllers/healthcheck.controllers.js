import { ApiResponse } from '../utils/api-response.js';

const healthcheck = (req, res) => {
  try {
    res.status(200).json(
      new ApiResponse(200, { message: "Server is Running" })
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { healthcheck }