const router = require('express').Router()
const db = require('../db')

/**
 * User
 * @typedef {object} User
 * @property {string} id.required - User Id
 * @property {string} username.required - User's Username
 * @property {string} password - User's Password
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 */

/**
 * User Login Response
 * @typedef {object} UserLoginResponse
 * @property {boolean} success - Whether or not the login attempt was successful
 */

/**
 * GET /api/users
 * @summary Endpoint to retrieve all users
 * @tags user
 * @return {array<User>} 200 - success response - application/json
 */
router.get('/', (req, res) => {
    let getAllQuery = db.prepare('SELECT userId as id, username, firstName, lastName FROM Users')
    res.send(getAllQuery.all())
})


/**
 * POST /api/users
 * @summary Endpoint to create a user
 * @tags user
 * @return {array<User>} 200 - success response - application/json
 */
router.post('/', (req, res) => {
    
})


/**
 * POST /api/users/{id}/sessions
 * @summary Endpoint for user login
 * @tags user
 * @param {string} id.path - User ID logging in
 * @return {UserLoginResponse} 204 - success response - application/json
 */
router.post(':userId/sessions', (req, res) => {

})



module.exports = router