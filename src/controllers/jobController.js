import cron from 'node-cron';
import { Job, JobValidationSchema } from '../models/job.js';
import { rejectionEmailQueue } from '../services/emailService.js';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import fs2 from 'fs';
import { Op } from 'sequelize';
import { FailedApi, SuccessApi } from '../helper/apiResponse.js';
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
    const { error } = JobValidationSchema(req.body);
    if (error) {
      return FailedApi(res, 400, { message: "Validation error", error: error.details[0].message });
    }
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
    if (req.file) {
      cvPath = req.file.path;
    }

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
    const allowedStatusValues = ['pending', 'accepted', 'rejected'];

    // Validate if the provided status is in the allowed values
    if (!allowedStatusValues.includes(status.toLowerCase())) {
      return FailedApi(res, 400, { error: 'Invalid status value' });
    }

    const applicant = await Job.findOne({
      where: { jobId: id },
    });

    if (!applicant) {
      return FailedApi(res, 404, { error: 'Applicant not found' });
    }

    applicant.status = status.toLowerCase(); // Normalize status to lowercase
    await applicant.save();

    if (status.toLowerCase() === 'rejected') {
      // Update applicant status and send response
      await rejectionEmailQueue.add('rejectionEmailQueue', { user: applicant });
      return SuccessApi(res, 200, { message: "Rejected Application Email has been Sent to Applicant's Email." });

    } else if (status.toLowerCase() === 'accepted') {
      return SuccessApi(res, 200, { message: 'Applicant has been accepted.' });
    }
  } catch (error) {
    console.error('Error:', error);
    return FailedApi(res, 500, { error: 'Internal Server Error' });
  }
};


const scheduleJob = () => {

  cron.schedule("*/2 * * * *", async () => {
    try {
      // Find all jobs that are rejected
      const rejectedJobs = await Job.findAll({
        where: {
          status: 'rejected'
        }
      });

      if (rejectedJobs && rejectedJobs.length > 0) {
        // Soft delete rejected jobs
        const result = await Job.destroy({
          where: {
            status: 'rejected'
          }
        });
        console.log(`Soft deletion completed successfully. ${result} jobs deleted.`);
      } else {
        console.log("No rejected jobs found to delete.");
      }
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

//     // Fetch records from the database using the provided ID
//     const user = await Job.findOne({
//       where: {
//         jobId: id
//       },
//     });

//     // Check if a user with the provided ID exists
//     if (!user) {
//       return FailedApi(res, 404, 'User not found');
//     }

//     const pdfPath = path.join(process.cwd(), 'uploads', `${user.email}.pdf`);

//     // Check if the file exists at the specified path
//     let fileExists = false;
//     try {
//       fs.accessSync(pdfPath);
//       fileExists = true;
//     } catch (err) {
//       fileExists = false;
//     }

//     if (!fileExists) {
//       return FailedApi(res, 404, 'CV File Not Found');
//     }

//     // Read the content of the CV file
//     const cvBuffer = fs.readFileSync(pdfPath);

//     // Set the response headers for file download
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename=${user.email}_CV.pdf`);

//     // Send the CV file data as a response
//     res.send(cvBuffer);
//   } catch (error) {
//     console.error('Error downloading CV:', error);
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