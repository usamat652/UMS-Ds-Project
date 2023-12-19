import Joi from 'joi';
import { DataTypes } from 'sequelize';
import {sequelize} from '../config/database.js'; 

const User = sequelize.define('User', {
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    // unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rememberToken: {
    type: DataTypes.STRING,
  },
  rememberTokenExpiry: {
    type: DataTypes.DATE,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

User.prototype.isRememberTokenExpired = function() {
  const currentTime = new Date().getTime();
  const tokenExpiryTime = new Date(this.rememberTokenExpiry).getTime();
  return currentTime > tokenExpiryTime;
};

const userJoiSchema = Joi.object({
    firstName: Joi.string().min(3).max(25).required(),
    lastName: Joi.string().min(0).max(25).required(),
    email: Joi.string().email().required(),
    password: Joi.string().pattern(new RegExp('^(?=.*?[a-z]).{8,}$')),
    rememberToken: Joi.string(),
    isAdmin: Joi.boolean().default(false),
    isVerified: Joi.boolean().default(false)
  });
  
  const validateUser = (user) => userJoiSchema.validate(user);
  
  export { User, validateUser };
