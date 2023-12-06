require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');


const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Email:', process.env.EMAIL);
    console.log('Password:', process.env.PASSWORD);

});
