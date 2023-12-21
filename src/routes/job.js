import express from 'express';
import { submitForm, handleFileUpload, getAllapplicants, updateApplicantStatus, downloadCv } from '../controllers/jobController.js';
import {authenticateUser} from '../middlewares/auth.js';
const JobRouter = express.Router()

JobRouter.post('/submit-form',handleFileUpload,submitForm);
JobRouter.get('/get-applicants',getAllapplicants);
JobRouter.patch('/update-applicants/:id',authenticateUser,updateApplicantStatus);
JobRouter.get('/download-cv/:id',authenticateUser,downloadCv);

export default JobRouter;