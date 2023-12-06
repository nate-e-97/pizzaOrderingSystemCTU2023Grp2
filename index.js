require('dotenv').config();

const express = require('express');
const expressJSDocSwagger = require('express-jsdoc-swagger');
const nodemailer = require('nodemailer');
const PORT = 43500

/**
 * This object defines metadata for the swagger documentation
 */
const jsDocOptions = {
    info: {
      version: '1.0.0',
      title: 'Pizza Ordering System',
      license: {
        name: 'MIT',
      },
    },
    swaggerUIPath: '/api/docs',
    exposeApiDocs: true,
    apiDocsPath: '/api/docs/json',
    security: {
      BasicAuth: {
        type: 'http',
        scheme: 'basic',
      },
    },
    baseDir: __dirname,
    filesPattern: './api/*.js',
};

// Create express app
const app = express();

// Initializes swagger documentation
expressJSDocSwagger(app)(jsDocOptions);

// Unpacks queries into objects
app.use(express.urlencoded({ extended: true }));

// Uses objects for request body
app.use(express.json());

// Serves up files that are linked statically (.css, .js files in our html)
app.use(express.static('./'))
app.use('/js', express.static('./js'))
app.use('/css', express.static('./css'))
app.use('/img', express.static('./img'))

// Cookie Parser makes it easier to handle cookie operations
app.use(require('cookie-parser')())

// CORS allows requests from localhost to hit localhost.
app.use(require('cors')())

// Authentication middleware
app.use(require('./middleware/auth'))

// API Router
app.use('/api', require('./api'))

// Frontend Router
app.use('/', require('./frontend_router'))

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
  }
});

app.post('/submit-feedback', (req, res) => {
  const { email, subject, description } = req.body;

  const mailOptions = {
      from: process.env.EMAIL, // Your server's email
      replyTo: email, // Customer's email address
      to: 'customerfeedbackPRGroup2@gmail.com', // Your support email
      subject: subject,
      text: `Message from ${email}: \n\n${description}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          console.error("Error sending email: ", error);
          res.status(500).send('Error sending feedback: ' + error.message);
      } else {
          console.log('Email sent: ' + info.response);
          res.send('Feedback sent successfully');
      }
  });
});

// Initializes the database
require('./db')

// Start the application
app.listen(PORT, () => console.log(`App listening at http://localhost:${PORT}`));