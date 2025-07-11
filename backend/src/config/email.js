const nodemailer = require('nodemailer');
const Email = require('email-templates');
const path = require('path');

let transporter = null;
let emailClient = null;

const initEmail = () => {
  // Check if email configuration exists
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('Email configuration not found, email notifications will be disabled');
    return false;
  }

  try {
    // Create transporter
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Create email template client
    emailClient = new Email({
      message: {
        from: process.env.EMAIL_FROM || 'Quest Board <noreply@questboard.com>'
      },
      send: true,
      transport: transporter,
      views: {
        root: path.join(__dirname, '../templates/emails'),
        options: {
          extension: 'pug'
        }
      },
      preview: process.env.NODE_ENV === 'development',
      i18n: {
        locales: ['ja', 'en'],
        defaultLocale: 'ja',
        directory: path.join(__dirname, '../locales')
      }
    });

    console.log('Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    return false;
  }
};

const verifyConnection = async () => {
  if (!transporter) return false;

  try {
    await transporter.verify();
    console.log('Email server connection verified');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
};

const getEmailClient = () => emailClient;
const getTransporter = () => transporter;

module.exports = {
  initEmail,
  verifyConnection,
  getEmailClient,
  getTransporter
};