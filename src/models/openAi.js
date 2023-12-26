import {DataTypes} from 'sequelize';
import { sequelize } from '../config/database.js';
// Define the Chat model
const Prompt = sequelize.define('Chat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  question: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gptResponse: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
// Synchronize the model with the database
Prompt.sync();
export {Prompt};