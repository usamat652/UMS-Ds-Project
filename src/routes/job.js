import express from 'express';
import { submitForm, handleFileUpload, getAllapplicants, updateApplicantStatus, downloadCv } from '../controllers/jobController.js';
import { authenticateMiddleware } from '../middlewares/auth.js';
const JobRouter = express.Router()

JobRouter.post('/submit-form',handleFileUpload,submitForm);
JobRouter.get('/get-applicants',authenticateMiddleware,getAllapplicants);
JobRouter.patch('/update-applicants/:id',authenticateMiddleware,updateApplicantStatus);
JobRouter.get('/download-cv/:id',authenticateMiddleware,downloadCv);

export default JobRouter;