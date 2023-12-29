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
        const { firstName, lastName } = user;
        const userName = `${firstName} ${lastName}`
        const verificationLink = `http://192.168.11.248:8080/#/ConfirmPass/${user.email}`;

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
            from: 'usamatariq0320@gmail.com',
            to: user.email,
            subject: 'Email Verification',
            html: `
            <!DOCTYPE html>
            <html lang="en">
            
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Set New Password</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                }
            
                .container {
                  padding: 20px;
                  background-color: #ffffff;
                  border-radius: 5px;
                  margin: 20px;
                }
            
                h2 {
                  color: #333;
                  font-size: 20px;
                  margin-bottom: 10px;
                }
            
                p {
                  color: #666;
                  line-height: 1.5;
                }
            
                .button {
                  background-color: #3498db;
                  color: #fff;
                  padding: 10px 20px;
                  border-radius: 5px;
                  text-decoration: none;
                  display: inline-block;
                }
              </style>
            </head>
            
            <body>
              <div class="container">
                <h2>Set Your New Password</h2>
                <p>Hi ${userName},</p>
                <p>To set your new password, click the button below:</p>
                <a href="${verificationLink}" class="button">Set New Password</a>
                <p>This link will expire in [number] hours for your security.</p>
                <p>If you didn't request a password reset, please disregard this email.</p>
                <p>For any assistance, contact our support team at [support email address].</p>
                <p>Best regards,</p>
                <p>The Developer Studio Team</p>
              </div>
            </body>
            
            </html>
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
        const { firstName, lastName } = user;
        const userName = `${firstName} ${lastName}`
        const resetPasswordLink = `http://192.168.11.248:8080/#/ConfirmPass/${user.email}`;

        // Sending the password reset email
        await transporter.sendMail({
            from: 'usamatariq0320@gmail.com',
            to: user.email,
            subject: 'Password Reset',
            html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Developer Studio Password Reset</title>
            <style>
                body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f7f7f7;
                }

                .container {
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                margin: 20px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }

                h2 {
                color: #333;
                font-size: 24px;
                margin-bottom: 12px;
                }

                p {
                color: #666;
                line-height: 1.6;
                margin-bottom: 10px;
                }

                a {
                text-decoration: none;
                }

                .button {
                display: inline-block;
                padding: 12px 24px;
                border-radius: 5px;
                background-color: #3498db;
                color: #fff;
                font-size: 16px;
                transition: background-color 0.3s ease;
                }

                .button:hover {
                background-color: #258cd1;
                }

                ul {
                list-style: none;
                padding-left: 0;
                }

                ul li {
                margin-bottom: 8px;
                }
            </style>
            </head>

            <body>
            <div class="container">
                <h2>Secure Your Developer Studio Account</h2>
                <p>Hi [${userName}],</p>
                <p>We recently detected a request to reset your password for your [Developer Studio] account. If you made this request, please click the button below to choose a new, secure password:</p>
                <a href="${resetPasswordLink}" style="text-decoration: none;">
                <div class="button">Reset Password</div>
                </a>
                <p>This link will expire in 24 hours for your security. If you didn't request a password reset, please don't worry! Your account remains safe.</p>
                <p><strong>Why did you receive this email?</strong></p>
                <p>We take the security of your Developer Studio account very seriously. We only send password reset emails when someone requests one. This helps to protect your account from unauthorized access.</p>
                <p><strong>Keeping your [Developer Studio] account secure:</strong></p>
                <ul>
                <li>Choose a strong password: Use a mix of upper and lowercase letters, numbers, and symbols. Aim for at least 12 characters.</li>
                <li>Don't reuse passwords: Avoid using the same password for multiple accounts.</li>
                <li>Enable two-factor authentication: This adds an extra layer of security to your account.</li>
                </ul>
                <p>If you have any questions or concerns, please don't hesitate to contact our support team at [support email address].</p>
                <p>Sincerely,</p>
                <p>The Developer Studio Team</p>
            </div>
            </body>

            </html>
        `,
        });
        console.log('Password reset email sent successfully');
    } catch (error) {
        console.error('Error sending password reset email:', error);
    }
});



// Process the task of sending rejection emails
rejectionEmailQueue.process('rejectionEmailQueue', async (job) => {
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
            from: 'usamatariq0320@gmail.com',
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



export {
    emailQueue,
    forgotPasswordQueue,
    rejectionEmailQueue
};
