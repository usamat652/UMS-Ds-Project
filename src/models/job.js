import Joi from 'joi';
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Job = sequelize.define('Job', {
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
        allowNull: true,
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
});

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


export { Job };
