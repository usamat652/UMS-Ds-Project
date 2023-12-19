import Joi from 'joi';
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ActivityLog = sequelize.define('ActivityLog', {
    logId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    action: {
        type: DataTypes.STRING
    },
    username: {
        type: DataTypes.STRING
    },
    userEmail: {
        type: DataTypes.STRING
    },
    details: {
        type: DataTypes.STRING
    },
}, {
    timestamps: true,
});


const ActivityLogJoiSchema = Joi.object({
    username: Joi.string().required(),
    userEmail: Joi.string().required(),
    action: Joi.string().required(),
    details: Joi.string().required(),
  });

const validateActivityLog = (logs) => ActivityLogJoiSchema.validate(logs);

export { ActivityLog, validateActivityLog };












// import Joi from 'joi';
// import { DataTypes } from 'sequelize';
// import { sequelize } from '../config/database.js';

// const ApiLog = sequelize.define('ApiLog', {
//   logId: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   requestUrl: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   requestMethod: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   requestBody: {
//     type: DataTypes.TEXT,
//   },
//   responseStatus: {
//     type: DataTypes.INTEGER,
//   },
//   responseBody: {
//     type: DataTypes.TEXT,
//   },
// }, {
//   timestamps: true,
// });

// // Joi validation schema for ApiLog attributes
// const apiLogJoiSchema = Joi.object({
//   requestUrl: Joi.string().required(),
//   requestMethod: Joi.string().required(),
//   requestBody: Joi.string(),
//   responseStatus: Joi.number(),
//   responseBody: Joi.string(),
//   createdAt: Joi.date().iso(),
// });

// // Function to validate ApiLog data using Joi schema
// const validateApiLog = (apiLog) => apiLogJoiSchema.validate(apiLog);

// export { ApiLog, validateApiLog };

// models/activityLog.js

// import { DataTypes } from 'sequelize';
// import { sequelize } from '../config/database.js';

// const ActivityLogs = sequelize.define(
//   'ActivityLog',
//   {
//     logId: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },
//     userId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     action: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     details: {
//       type: DataTypes.JSONB,
//     },
//   },
//   {
//     timestamps: true, // Enable Sequelize's default timestamps
//   }
// );

// export default ActivityLogs;
