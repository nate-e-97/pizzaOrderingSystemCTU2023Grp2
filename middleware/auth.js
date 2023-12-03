const db = require('../db')

module.exports = (req, res, next) => {
    let getUserQuery = db.prepare('SELECT userId, username, password FROM Users WHERE username = (@username)')
    
    if (req.headers.authorization) {
        let authData = req.headers.authorization.split(" ")[1]
        let bufferObj = Buffer.from(authData, "base64")

        let authString = bufferObj.toString("utf-8")

        let username = authString.split(":")[0]
        let password = authString.split(":")[1]

        let testUser = getUserQuery.get({username: username})

        console.info(`User ${testUser.username} attempting login`)

        if (testUser.password == password) res.locals.user = testUser.userId
        else res.locals.user = null
    }
    else res.locals.user = null

    next()
}