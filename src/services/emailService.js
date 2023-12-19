import transporter from "../config/emailConfig.js";
import EmailVerificationJob from "../models/emailJob.js";
import Queue from "bull";
import { Op } from 'sequelize';



const emailQueue = new Queue('emailQueue');
const forgotPasswordQueue = new Queue('forgotPasswordQueue');
const rejectionEmailQueue = new Queue('rejectionEmailQueue');


emailQueue.process("sendVerificationEmail", async (job) => {
    try {
        const { user } = job.data;
        const verificationLink = `http://localhost:3000/user/setPassword/${user.email}`;

        // Sending verification email
        console.log('Verification email Sent to:', user.email);
        console.log('Verification link:', verificationLink);

        const uniqueJobName = `sendVerificationEmail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const jobData = { user: user };
        await EmailVerificationJob.create({
            name: uniqueJobName,
            data: jobData,
        });

        await transporter.sendMail({
            from: 'jt7357890@gmail.com',
            to: user.email,
            subject: 'Email Verification',
            html: `
                <div style="background-color: #f4f4f4; padding: 20px;">
                    <h2 style="color: #333;">Verify Your Email</h2>
                    <p style="color: #666;">Please click the button below to verify your account:</p>
                    <a href="${verificationLink}" style="text-decoration: none;">
                        <div style="background-color: #3498db; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block;">
                            Verify Email
                        </div>
                    </a>
                </div>
            `,
        });
        console.log('Verification email sent successfully.');

        const foundJob = await EmailVerificationJob.findOne({
            where: {
                name: {
                    [Op.like]: `%${job.name}%`
                }
            }
        });
        if (foundJob) {
            // If the job is found, delete it
            await foundJob.destroy();
            console.log('Job deleted successfully');
        } else {
            console.log('Job not found');
            // Handle the case where the job doesn't exist
        }
    } catch (emailError) {
        console.error('Error sending verification email:', emailError);

        // If an error occurs, update job state in the Sequelize EmailVerificationJob model
        await EmailVerificationJob.update(
            { state: 'failed', failed_at: new Date() },
            { where: { name: job.name } }
        );
        // Handle error in removing job
        console.error('Error removing job:', emailError.message);
    }
});


forgotPasswordQueue.process('sendPasswordResetEmail', async (job) => {
    try {
        const { user } = job.data;

        const resetPasswordLink = `http://192.168.11.172:3000/user/setPassword/${user.email}`;

        // Sending the password reset email
        await transporter.sendMail({
            from: 'jt7357890@gmail.com',
            to: user.email,
            subject: 'Password Reset',
            html: `
          <p>Dear User,</p>
          <p>Please click the following link to reset your password:</p>
          <p><a href="${resetPasswordLink}">Reset Password</a></p>
        `,
        });

        console.log('Password reset email sent successfully');
    } catch (error) {
        console.error('Error sending password reset email:', error);
    }
});



// Process the task of sending rejection emails
rejectionEmailQueue.process('rejectionEmailQueue', async(job) => {
    try {
        const email = job.data.user;
        const userName = job.data.user;
        // console.log(applicant.email)
        const rejectionMessage = `
      <h1>Dear ${userName},</h1>
      <p>We regret to inform you that your application has been rejected.</p>
      <!-- Rest of the rejection message -->
    `;

        await transporter.sendMail({
            from: 'jt7357890@gmail.com',
            to: email,
            subject: 'Application Status',
            html: rejectionMessage,
        });

        console.log('Rejection email sent successfully');
    } catch (error) {
        console.error('Error sending rejection email:', error);
        // Handle errors if necessary
    }
});



export { emailQueue, forgotPasswordQueue, rejectionEmailQueue };
