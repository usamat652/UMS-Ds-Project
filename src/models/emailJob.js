import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const EmailVerificationJob = sequelize.define('EmailVerificationJob', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  data: {
    type: DataTypes.JSON, // Change JSONB to JSON
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
  },
  failed_at: {
    type: DataTypes.DATE,
    defaultValue: null,
  },
}, {
  timestamps: true,
});

export default EmailVerificationJob;
