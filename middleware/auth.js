const db = require('../db')

module.exports = (req, res, next) => {
    let getUserQuery = db.prepare('SELECT userId, username, password, preferredAddress, preferredCard FROM Users WHERE username = @username')
    
    if (req.headers.authorization) {
        let authData = req.headers.authorization.split(" ")[1]
        let bufferObj = Buffer.from(authData, "base64")

        let authString = bufferObj.toString("utf-8")

        let username = authString.split(":")[0]
        let password = authString.split(":")[1]

        let testUser = getUserQuery.get({username: username})

        console.info(`User ${testUser.username} attempting regular login`)

        if (testUser.password == password) {
            res.locals.user = testUser.userId
            res.locals.userAddress = testUser.preferredAddress
            res.locals.userCard = testUser.preferredCard
            let permTest = db.prepare('SELECT permissionName FROM UserPermissionRelations WHERE userId=@userId').get({userId: testUser.userId})
            res.locals.isAdmin = permTest && permTest.permissionName == "Admin"
        }
        else {
            res.clearCookie('loginToken')
            res.clearCookie('activeUser')
            res.locals.user = null
        }
    }
    else if (req.cookies.loginToken) {
        let authData = req.cookies.loginToken.split(" ")[1]
        let bufferObj = Buffer.from(authData, "base64")

        let authString = bufferObj.toString("utf-8")

        let username = authString.split(":")[0]
        let password = authString.split(":")[1]

        let testUser = getUserQuery.get({username: username})

        console.info(`User ${testUser.username} attempting cookie login`)

        if (testUser.password == password) {
            res.locals.user = testUser.userId
            res.locals.userAddress = testUser.preferredAddress
            res.locals.userCard = testUser.preferredCard
            let permTest = db.prepare('SELECT permissionName FROM UserPermissionRelations WHERE userId=@userId').get({userId: testUser.userId})
            res.locals.isAdmin = permTest && permTest.permissionName == "Admin"
        }
        else {
            res.clearCookie('loginToken')
            res.clearCookie('activeUser')
            res.locals.user = null
        }
    }
    else {
        res.clearCookie('loginToken')
        res.clearCookie('activeUser')
        res.locals.user = null
    }

    next()
}