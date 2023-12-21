import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Prompt = sequelize.define('prompt', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    }, 
    request: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    response: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  export {Prompt}