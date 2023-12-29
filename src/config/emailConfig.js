 import nodemailer from 'nodemailer';


 var transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "7df2c67161cdf7",
    pass: "6caaeb4f508a86"
  }
});
  export default transporter