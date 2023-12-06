const router = require('express').Router()
const db = require('../db')

/**
 * User
 * @typedef {object} User
 * @property {string} id - User Id
 * @property {string} username.required - User's Username
 * @property {string} password.required - User's Password
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
    let getAllQuery = db.prepare('SELECT userId as id, username, firstName, lastName, phoneNumber FROM Users')
    res.send(getAllQuery.all())
})

/**
 * POST /api/users
 * @summary Endpoint to create a user
 * @param {User} request.body.required - New user details
 * @tags user
 * @return {User} 201 - success response - application/json
 */
router.post('/', (req, res) => {
    let requiredFields = ["username", "password", "firstName", "lastName"]

    if (requiredFields.every( element => Object.keys(req.body).includes(element) )) {
        let insertUserQuery = db.prepare(`INSERT INTO Users (username, password, firstName, lastName, phoneNumber) VALUES (@username, @password, @firstName, @lastName, @phoneNumber)`)

        let transaction = db.transaction((user) => {
            if (! user.hasOwnProperty('phoneNumber')) user.phoneNumber = null
            insertUserQuery.run(user)
        })

        try {
            transaction(req.body)

            res.status(201).send(db.prepare(`SELECT username, firstName, lastName FROM Users WHERE username = @username`).get(req.body))
        }
        catch {
            res.status(500).send("Something went wrong")
        }
    }
    else {
        res.status(400).send("Missing required field(s)")
    }
})

/**
 * POST /api/users/{id}/sessions
 * @summary Endpoint for user login
 * @tags user
 * @return {UserLoginResponse} 204 - success response - application/json
 */
router.post('/sessions', (req, res) => {
    if (res.locals.user) {
        let authData = req.headers.authorization

        let authCookie = req.cookies.loginToken

        if (authCookie === undefined) res.cookie('loginToken', authData, {maxAge: 9999999, httpOnly: true})

        res.status(204).send('Logged In')
    }
    else res.status(401).send('Not Authorized')
})

/**
 * DELETE /api/users/{id}/sessions
 * @summary Endpoint for user logout
 * @tags user
 * @return {UserLoginResponse} 204 - success response - application/json
 */
router.delete('/sessions', (req, res) => {
    if (req.cookies.loginToken) {
        res.clearCookie('loginToken')

        res.status(204).send('Logged Out')
    }
    else res.status(401).send('Not Authorized')
})


module.exports = router