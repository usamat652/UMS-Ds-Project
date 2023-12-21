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
    userAgent: {
        type: DataTypes.STRING,
      },
}, {
    timestamps: true,
});


const ActivityLogJoiSchema = Joi.object({
    username: Joi.string().required(),
    userEmail: Joi.string().required(),
    action: Joi.string().required(),
    details: Joi.string().required(),
    userAgent: Joi.string().required(),
  });

const validateActivityLog = (logs) => ActivityLogJoiSchema.validate(logs);

export { ActivityLog, validateActivityLog };






