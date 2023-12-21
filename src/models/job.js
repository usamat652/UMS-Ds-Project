import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Joi from 'joi';

const Job = sequelize.define('Job', {
    Id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
    jobId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    qualification: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cnic: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
    },
    cv: {
        type: DataTypes.STRING,
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    isDelete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    }
}, {
    timestamps: true,
},
{
    paranoid: true, 
});


function JobValidationSchema(job) {
    const schema = Joi.object({
        userName: Joi.string().alphanum().min(3).max(15).required(),
        email: Joi.string().required().email(),
        qualification: Joi.string().required(),
        cnic: Joi.string().pattern(/^\d{13}$/).required(),
        address: Joi.string().required(),
        phoneNumber: Joi.string().pattern(/^\d{11}$/).required(),
        age: Joi.number().integer().positive().max(120).required()
    });
    return schema.validate(job);
}
// Define Joi schema for validation
// const JobValidationSchema = Joi.object({
//     jobId: Joi.string().required(),
//     userName: Joi.string().required(),
//     email: Joi.string().email().required(),
//     qualification: Joi.string().required(),
//     cnic: Joi.string().required(),
//     address: Joi.string().required(),
//     phoneNumber: Joi.string().required(),
//     status: Joi.string().valid('pending', 'accepted', 'rejected').required(),
//     cv: Joi.string().allow(null),
//     age: Joi.number().required(),
//     isDelete: Joi.boolean(),
// });
// const validateJob = (job) => JobValidationSchema.validate(job);


export { Job, JobValidationSchema };
