import cron from 'node-cron';
import { Job, JobValidationSchema } from '../models/job.js';
import { rejectionEmailQueue } from '../services/emailService.js';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import fs2 from 'fs';
import { Op } from 'sequelize';
import { FailedApi, SuccessApi } from '../config/apiResponse.js';
import os from 'os';


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Specify the destination folder where the uploaded files will be stored
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Customize the filename to include the email address with PDF extension
    const email = req.body.email || "default";
    const fileName = `${email}.pdf`;
    cb(null, fileName);
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


// for (const job of rejectedJobs) {
//   const pdfPath = `C:\\Users\\usama\\Desktop\\DS-Final-Project\\uploads\\${job.email}.pdf`;
//   // Check if the CV file exists before attempting to delete
//   if (fs.existsSync(pdfPath)) {
//     fs.unlinkSync(pdfPath);
//   }
// }
const submitForm = async (req, res) => {
  try {
    // const { error } = JobValidationSchema(req.body);
    //     if (error) {
    //         return FailedApi(res, 400, { message: "Validation error", error: error.details[0].message });
    //     }
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
    let cvPath = '';
    if (req.file ) {
      cvPath = req.file.path;
    }
    // const cvPath = req.file ? req.file.path : ''; // Check if the file was uploaded

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
    console.log(cvPath);
    return SuccessApi(res, 200, {
      message: 'Job applicant created successfully',
      data: newApplicant,
    });
  } catch (error) {
    if (req.file.path) {
      fs2.unlinkSync(req.file.path);
    }
    console.error('Error creating job applicant:', error);
    return FailedApi(res, 400, { error: 'Error creating job applicant' });
  }
};

const getAllapplicants = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
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
    console.log("Get All Applicants Api Hit")
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

    if (status === 'rejected' || 'Rejected') {
      // Add the task to the Bull rejectionEmailQueue

      // Update applicant status and send response
      applicant.status = status;
      await applicant.save();
      await rejectionEmailQueue.add('rejectionEmailQueue', { user: applicant });
    } else if(status === 'accepted'){
        applicant.status = status;
        await applicant.save();
        res.status(200).json({ message: 'Applicant has been accepted.' });
      }
      return SuccessApi(res, 200, {
        status: 'Application Rejected',
        data: applicant,
      });

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

const softDeleteRejectedJobs = async () => {
  try {
    const result = await Job.destroy({
      where: {
        status: 'rejected'
      }
    });
    return "Soft deletion completed successfully";
  } catch (error) {
    return error;
  }
};

const scheduleJob = () => {
  cron.schedule("*/30 * * * *", async () => {
    try {
      const deletedJobs = await softDeleteRejectedJobs();
      console.log(deletedJobs);
    } catch (error) {
      console.error("Error in cron job:", error);
    }
  });
};

const downloadCv = async (req, res) => {
  try {
    const { id } = req.params;
    // Fetch records from the database using the provided email
    const user = await Job.findOne({
      where: {
        jobId: id
      },
    });
    // Check if a user with the provided email exists
    if (!user) {
      return FailedApi(res, 404, "User Not Found");
    }

    // Define the path to the CV file in the uploads folder
    const pdfPath = path.join(process.cwd(), 'uploads', `${user.email}.pdf`);

    // Check if the file exists
    try {
      await fs.access(pdfPath);
    } catch (error) {
      return FailedApi(res, 404, "CV File Not Found");
    }

    // Define the destination path in the Downloads directory
    const downloadPath = path.join(os.homedir(), 'Downloads', `${user.email}_CV.pdf`);

    // Copy the CV file from the uploads folder to the Downloads directory
    await fs.copyFile(pdfPath, downloadPath);

    // Send a success message in the response
    return SuccessApi(res, 200, { message: 'CV downloaded successfully to Downloads folder' });
  } catch (error) {
    console.error("Error downloading CV:", error);
    return FailedApi(res, 500, { message: 'Internal server error' });
  }
};


// const downloadCv = async (req, res) => {
//   try {
//     const { id } = req.params;
//     // Fetch records from the database using the provided email
//     const user = await Job.findOne({
//       where: {
//         jobId: id
//       },
//     });
//     // Check if a user with the provided email exists
//     if (!user) {
//       return FailedApi(res, 404, "User Not Found");
//     }
//     // Read the CV file associated with the user's email
//     const pdfPath = `uploads/${user.email}.pdf`;
//     const cvBuffer = fs.readFileSync(pdfPath);
//     // Set the response headers for file download
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", `attachment; filename=${user.email}_CV.pdf`);
//     // Send the CV file as a response
//     res.send(cvBuffer);
//   } catch (error) {
//     console.error("Error downloading CV:", error);
//     return FailedApi(res, 500, { message: 'Internal server error' });
//   }
// };


export {
  submitForm,
  handleFileUpload,
  getAllapplicants,
  updateApplicantStatus,
  downloadCv,
  scheduleJob
};