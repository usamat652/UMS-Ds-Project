import { ApiLogs, validateApiLog } from '../models/apilogs.js';

const apiDetails = async (req, res, next) => {
  const logData = {
    requestMethod: req.method, 
    requestUrl: req.url,
    accept: req.headers.accept,
    userAgent: req.headers["user-agent"],
    // postmanToken: req.headers["postman-token"],
    acceptEncoding: req.headers["accept-encoding"],
    connection: req.headers.connection,
    requestBody: JSON.stringify({ body: req.body }), 
  };


  res.on('finish', async () => {
    logData.statusCode = res.statusCode;

    try {
      // Validate the log data before creating the log entry
      validateApiLog(logData);
      await ApiLogs.create(logData);
    //   console.log('Log entry saved successfully:', createdLog.toJSON());
    } catch (error) {
      console.error('Error saving log entry to Sequelize:', error.message);
    }
  });

  next();
};

export default apiDetails;
