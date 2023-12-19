import { Job } from '../models/job.js';
import { rejectionEmailQueue } from '../services/emailService.js';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { Op } from 'sequelize';
import { FailedApi, SuccessApi } from '../config/apiResponse.js';


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage: storage }).single('cv');

const handleFileUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return FailedApi(res, 400, { error: 'File upload error' });
    }
    next();
  });
};
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/');
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//   },
// });
// const upload = multer({ storage: storage }).single('cv');
// const handleFileUpload = (req, res, next) => {
//   upload(req, res, function (err) {
//   if (err instanceof multer.MulterError) {
//     return res.status(400).json({ error: 'File upload error' });
//   } else if (err) {
//     return res.status(500).json({ error: 'Internal server error' });
//   }
//   next();
// });
// };
const submitForm = async (req, res) => {
  try {
    const {
      userName,
      email,
      qualification,
      cnic,
      address,
      phoneNumber,
      status = 'pending',
      age,
      isDelete = false,
    } = req.body;

    const cvPath = req.file ? req.file.path : ''; // Check if the file was uploaded

    // Create a new job applicant
    const newApplicant = await Job.create({
      jobId: uuidv4(),
      userName,
      email,
      qualification,
      cnic,
      address,
      phoneNumber,
      status,
      cv: cvPath,
      age,
      isDelete,
    });

    return SuccessApi(res, 200, {
      message: 'Job applicant created successfully',
      data: newApplicant,
    });
  } catch (error) {
    console.error('Error creating job applicant:', error);
    return FailedApi(res, 400, { error: 'Error creating job applicant' });
  }
};

const getAllapplicants = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    // Build the where clause for filtering applicants
    const whereClause = {
      [Op.or]: [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ],
      status: { [Op.like]: `%${status}%` },
    };

    // Find applicants based on the provided criteria
    const applicants = await Job.findAndCountAll({
      where: whereClause,
      offset,
      limit,
    });

    // If no applicants found, return a failed status
    if (!applicants) {
      return FailedApi(res, 404, {
        status: "failed",
        message: "No applicants found based on the provided criteria.",
      });
    }

    // Calculate pagination details
    const totalPages = Math.ceil(applicants.count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const nextLink = hasNextPage ? `/api/get-applicants?page=${page + 1}&limit=${limit}&search=${search}&status=${status}` : null;
    const prevLink = hasPrevPage ? `/api/get-applicants?page=${page - 1}&limit=${limit}&search=${search}&status=${status}` : null;

    // Return the response with the retrieved data and pagination details
    SuccessApi(res, 200, {
      pagination: {
        totalApplicants: applicants.count,
        page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextLink,
        prevLink,
      },
      data: applicants.rows,
    });
  } catch (error) {
    // Handle any errors that occur during the process
    FailedApi(res, 500, {
      message: "An error occurred while fetching applicants.",
      error: error.message,
    });
  }
};

const updateApplicantStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const applicant = await Job.findOne({
      where: { jobId: id },
    });

    if (!applicant) {
      return FailedApi(res, 404, { error: 'Applicant not found' });
    }

    applicant.status = status;
    await applicant.save();

    if (status === 'rejected'|| 'Rejected') {
      // Add the task to the Bull rejectionEmailQueue
      
      // Update applicant status and send response
      applicant.status = status;
      await applicant.save();
      await rejectionEmailQueue.add('rejectionEmailQueue', { user: applicant });
      
      return SuccessApi(res, 200, {
        status: 'Application Rejected',
        data: applicant,
      });
    }

    // If status is not 'rejected', send 'Application Accepted' response
    return SuccessApi(res, 200, {
      status: 'Application Accepted',
      data: applicant,
    });
  } catch (error) {
    console.error('Error:', error);
    return FailedApi(res, 500, { error: 'Internal Server Error' });
  }
};


const downloadCv = async (req, res) => {
  const { id } = req.params;
  try {
    const applicant = await Job.findOne({
      where: {
        jobId: id,
      },
    });

    if (!applicant) {
      return FailedApi(res, 404, { message: 'Applicant not found' });
    }
    const cvFilePath = applicant.cv
    console.log('CV File Path:', cvFilePath);
    if (fs.existsSync(cvFilePath)) {
      const fileExtension = path.extname(applicant.cv);
      res.setHeader('Content-Disposition', `attachment; filename="${applicant.userName}_CV${fileExtension}"`);
      res.setHeader('Content-Type', 'application/pdf');
      const fileStream = fs.createReadStream(cvFilePath);
      fileStream.pipe(res);
    } else {
      FailedApi(res, 404, { message: 'CV file not found' });
    }
  } catch (error) {
    console.error('Error downloading CV:', error);
    FailedApi(res, 500, { message: 'Internal server error' });
  }
};


export {
  submitForm,
  handleFileUpload,
  getAllapplicants,
  updateApplicantStatus,
  downloadCv
};