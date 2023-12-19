 import nodemailer from 'nodemailer';


 var transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "5d6a0b9244545a",
      pass: "5bbd8736a96f95"
    }
  });
  export default transporter