const express = require('express');
const expressJSDocSwagger = require('express-jsdoc-swagger');

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

// Authentication middleware
app.use(require('./middleware/auth'))

// API Router
app.use('/api', require('./api'))

// Frontend Router
app.use('/', require('./frontend_router'))

// Initializes the database
require('./db')

// Start the application
app.listen(PORT, () => console.log(`App listening at http://localhost:${PORT}`));