const router = require('express').Router()
const db = require('../db')

/**
 * User
 * @typedef {object} User
 * @property {string} userId - User Id
 * @property {string} username.required - User's Username
 * @property {string} password.required - User's Password
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} phoneNumber - User's phone number
 */

/**
 * Address
 * @typedef {object} Address
 * @property {number} addressId - Address ID
 * @property {string} addressLine1 - Address line 1
 * @property {string} addressLine2 - Address line 2
 * @property {string} city - City of Address
 * @property {string} stateCode - State Code for address (e.g. CO, CA)
 * @property {string} zipCode - Zip Code of Address
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
    let getAllQuery = db.prepare('SELECT userId, username, firstName, lastName, phoneNumber, activeCart FROM Users')
    res.send(getAllQuery.all())
})

router.get('/:userId', (req, res) => {
    let getOneUserQuery = db.prepare(`
        SELECT userId, username, firstName, lastName, phoneNumber, activeCart FROM Users WHERE userId = @userId
    `)

    let userData = getOneUserQuery.get({userId: req.params.userId})

    if (!userData) res.status(404).send('Not Found')
    else {
        let getUserPaymentMethodsQuery = db.prepare(`
            SELECT P.CardId, P.cardNumber, P.cardExpDate, P.cardCvv, P.cardCardholderName
            FROM UserPaymentMethodRelations UPR
            JOIN PaymentMethods P 
                ON UPR.cardId = P.cardId
            WHERE UPR.userId = @userId
        `)

        let cardsData = getUserPaymentMethodsQuery.all({userId: req.params.userId})

        let getUserAddressesQuery = db.prepare(`
            SELECT A.addressId, A.addressLine1, A.addressLine2, A.city, A.stateCode, A.zipCode
            FROM UserAddressRelations UAR
            JOIN Addresses A
                ON UAR.addressId = A.addressId
            WHERE UAR.userId = @userId
        `)

        let addressesData = getUserAddressesQuery.all({userId: req.params.userId})

        let getUserOrderHistory = db.prepare(`
            SELECT O.OrderId
            FROM Orders O
            JOIN Users U
                ON U.userId = O.userId
        `)

        let ordersData = getUserOrderHistory.all({userId: req.params.userId})

        userData.cards = cardsData
        userData.addresses = addressesData
        userData.orders = ordersData

        res.send(userData)
    }
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
        let insertUserQuery = db.prepare(`
            INSERT INTO Users (username, password, firstName, lastName, phoneNumber) 
            VALUES (@username, @password, @firstName, @lastName, @phoneNumber)
            RETURNING userId, username, firstName, lastName`)

        let transaction = db.transaction((user) => {
            if (! user.hasOwnProperty('phoneNumber')) user.phoneNumber = null
            return insertUserQuery.get(user)
        })

        try {
            let newUser = transaction(req.body)

            res.status(201).send(newUser)
        }
        catch {
            res.status(500).send("Something went wrong")
        }
    }
    else {
        res.status(400).send("Missing required field(s)")
    }
})

router.post('/carts', (req, res) => {
    if (res.locals.user) {
        // User Cart Flow
        let currentUserCart = db.prepare(`SELECT activeCart FROM Users WHERE userId=@userId`).get({userId: res.locals.user})

        let currentCartId

        if (! currentUserCart.activeCart) {
            if (req.cookies.activeCart) {
                // User signed in after creating a cart, update user and move on
                db.prepare(`UPDATE Users SET activeCart=@activeCart WHERE userId=@userId`).run({activeCart: req.cookies.activeCart, userId: res.locals.user})
            }
            else {
                let createCartQuery = db.prepare(`INSERT INTO Carts DEFAULT VALUES RETURNING cartId`)

                currentCartId = createCartQuery.get().cartId

                db.prepare(`UPDATE Users SET activeCart=@activeCart WHERE userId=@userId`).run({activeCart: currentCartId, userId: res.locals.user})
            }
        }
        else {
            currentCartId = currentUserCart.activeCart
        }

        res.cookie('activeCart', currentCartId, {maxAge: 9999999, httpOnly: false})
        res.status(201).send('Created')
    }
    else {
        // Guest Cart Flow
        if (! req.cookies.activeCart) {
            let createCartQuery = db.prepare(`INSERT INTO Carts DEFAULT VALUES RETURNING cartId`)

            currentCartId = createCartQuery.get().cartId

            res.cookie('activeCart', currentCartId, {maxAge: 9999999, httpOnly: false})
        }

        res.status(201).send('Created')
    }
})

router.delete('/carts', (req, res) => {
    let createCartQuery = db.prepare(`INSERT INTO Carts DEFAULT VALUES RETURNING cartId`)

    let currentCartId = createCartQuery.get().cartId

    if (res.locals.user) {
        // Add new cart to user (old cart removed)
        db.prepare(`UPDATE Users SET activeCart=@activeCart WHERE userId=@userId`).run({activeCart: currentCartId, userId: res.locals.user})
    }
    
    res.cookie('activeCart', currentCartId, {maxAge: 9999999, httpOnly: false})
    res.status(204).send('No Content')
})

router.get('/carts/:cartId', (req, res) => {
    let getCartQuery = db.prepare(`
        SELECT cartItemRelId, itemType, itemReference, count, price, size FROM CartDynamicItemRelations WHERE cartId=@cartId
    `)

    let cartData = getCartQuery.all({cartId: req.params.cartId})

    if (cartData) res.send(cartData)
    else res.status(404).send('Not Found')
})

router.post('/carts/:cartId', (req, res) => {
    let requiredFields = ['itemType', 'itemReference', 'size']

    if (requiredFields.every(e => req.body.hasOwnProperty(e))) {
        let itemPrice = 0

        if (req.body.itemType == "MenuPizzas") {
            itemPrice = db.prepare(`SELECT price FROM MenuPizzas WHERE pizzaName=@itemReference`).get({itemReference: req.body.itemReference}).price

            let testIfItemExistsQuery = db.prepare(`
                SELECT itemReference, count FROM CartDynamicItemRelations WHERE itemType='MenuPizzas' AND itemReference=@itemReference AND cartId=@cartId
            `)

            let existsData = testIfItemExistsQuery.get({cartId: req.params.cartId, itemReference: req.body.itemReference})

            if (existsData) {
                let updateCartEntryQuery = db.prepare(`
                    UPDATE CartDynamicItemRelations
                    SET count=@count
                    WHERE itemType='MenuPizzas' 
                        AND itemReference=@itemReference 
                        AND cartId=@cartId
                `)

                updateCartEntryQuery.run({
                    itemReference: req.body.itemReference,
                    cartId: req.params.cartId,
                    count: existsData.count < 5 ? existsData.count + 1 : 5
                })
            }
            else {
                let insertCartItemQuery = db.prepare(`
                    INSERT INTO CartDynamicItemRelations (itemType, itemReference, count, price, size, cartId)
                    VALUES (@itemType, @itemReference, @count, @price, @size, @cartId)
                `)

                insertCartItemQuery.run({
                    itemType: req.body.itemType,
                    itemReference: req.body.itemReference,
                    price: itemPrice,
                    count: 1,
                    size: req.body.size,
                    cartId: req.params.cartId
                })
            }
        }
        else if (req.body.itemType == "CustomPizzas") {
            switch (req.body.size) {
                case 'LG':
                    itemPrice = 1299
                    break;
                case 'MED':
                    itemPrice = 1099
                    break;
                case 'SM':
                    itemPrice = 899
                    break;
                default:
                    itemPrice = 0
                    break;
            }

            let newCustomPizzaQuery = db.prepare(`
                INSERT INTO CustomPizzas DEFAULT VALUES RETURNING pizzaId
            `)

            let insertCartItemQuery = db.prepare(`
                INSERT INTO CartDynamicItemRelations (itemType, itemReference, count, price, size, cartId)
                VALUES (@itemType, @itemReference, @count, @price, @size, @cartId)
            `)

            insertCartItemQuery.run({
                itemType: req.body.itemType,
                itemReference: newCustomPizzaQuery.get().pizzaId,
                price: itemPrice,
                count: 1,
                size: req.body.size,
                cartId: req.params.cartId
            })
        }

        res.status(201).send('Created')
    }
    else res.status(400).send('Incomplete Body')
})

router.put('/carts/:cartId', (req, res) => {
    let requiredFields = ['itemId']

    if (requiredFields.every(e => req.body.hasOwnProperty(e))) {
        let itemQuery = db.prepare(`
            SELECT cartItemRelId, itemType, itemReference, count, price, size FROM CartDynamicItemRelations WHERE cartItemRelId=@itemId
        `)

        let existingItem = itemQuery.get({itemId: req.body.itemId})

        if (! existingItem) res.status(404).send('Not Found')

        if (req.body.hasOwnProperty('count')) {
            if (req.body.count == 0) {
                // Unset cart so the value is unassociated, removing it from the cart
                db.prepare(`
                    UPDATE CartDynamicItemRelations
                    SET cartId = NULL
                    WHERE cartItemRelId=@itemId
                `).run({
                    itemId: req.body.itemId
                })
            }
            else {
                db.prepare(`
                    UPDATE CartDynamicItemRelations
                    SET count=@count
                    WHERE cartItemRelId=@itemId
                `).run({
                    itemId: req.body.itemId,
                    count: req.body.count < 5 ? req.body.count : 5
                })
            }
        }

        res.status(204).send('No Content')
    }
    else res.status(400).send('Incomplete Body')
})

router.get('/pizzas/:pizzaId', (req, res) => {
    let pizzaExists = db.prepare('SELECT pizzaId FROM CustomPizzas WHERE pizzaId=@pizzaId').get({pizzaId: req.params.pizzaId})

    if (pizzaExists) {
        let ingredientsQuery = db.prepare(`
            SELECT I.ingredientName, I.extraCost, I.ingredientType
            FROM CustomPizzaIngredientRelations CIR
            JOIN Ingredients I
                ON CIR.ingredientName = I.ingredientName
            WHERE CIR.pizzaId=@pizzaId
        `)

        let ingredientsData = ingredientsQuery.all({pizzaId: pizzaExists.pizzaId})
        let ingredientsResponse = {
            sauce: null,
            crust: null,
            toppings: []
        }

        ingredientsData.forEach(ingredient => {
            if (ingredient.ingredientType == "SAUCE") ingredientsResponse.sauce = ingredient
            else if (ingredient.ingredientType == "CRUST") ingredientsResponse.crust = ingredient
            else {
                ingredientsResponse.toppings.push(ingredient)
            }
        })

        res.send(ingredientsResponse)
    }
    else {
        res.status(404).send('Not Found')
    }
})

router.put('/pizzas/:pizzaId', (req, res) => {
    let requiredFields = ['crust', 'sauce', 'toppings']

    if (requiredFields.every(e => req.body.hasOwnProperty(e))) {
        let pizzaExists = db.prepare('SELECT pizzaId FROM CustomPizzas WHERE pizzaId=@pizzaId').get({pizzaId: req.params.pizzaId})

        if (pizzaExists) {
            db.prepare('DELETE FROM CustomPizzaIngredientRelations WHERE pizzaId=@pizzaId').run({pizzaId: pizzaExists.pizzaId})
    
            let makeNewRelationsQuery = db.prepare(`
                INSERT INTO CustomPizzaIngredientRelations (ingredientName, pizzaId) VALUES (@ingredientName, @pizzaId)
            `)

            makeNewRelationsQuery.run({ingredientName: req.body.crust, pizzaId: pizzaExists.pizzaId})
            makeNewRelationsQuery.run({ingredientName: req.body.sauce, pizzaId: pizzaExists.pizzaId})
            req.body.toppings.forEach(topping => {
                makeNewRelationsQuery.run({ingredientName: topping, pizzaId: pizzaExists.pizzaId})
            })
            
            res.status(201).send('Success')
        }
        else {
            res.status(404).send('Not Found')
        }
    }
    else res.status(400).send('Incomplete Body')
    
})

router.get('/orders', (req, res) => {

})

router.post('/orders', (req, res) => {
    let requiredFields = ['paymentMethod', 'shippingAddress']

    if (requiredFields.every(e => req.body.hasOwnProperty(e))) {
        let createOrderQuery = db.prepare(`INSERT INTO Orders (userId, paymentMethod, shippingAddress, cartId) VALUES (
            @userId, @paymentMethod, @shippingAddress, @cartId
        )`)
    
        let userId = res.locals.user ? res.locals.user : 0
        let cartId = req.cookies.activeCart

        let shippingAddress
        let paymentMethod

        if (req.body.shippingAddress.hasOwnProperty('addressId')) {
            // Existing address, check it exists and if so, add it, if not make it and go
            let existingAddress = db.prepare(`SELECT addressId FROM Addresses WHERE addressId=@addressId`).get({addressId: req.body.shippingAddress.addressId})
            if (existingAddress) shippingAddress = existingAddress.addressId
            else {
                let newAddress = db.prepare(`
                    INSERT INTO Addresses (addressLine1, addressLine2, city, stateCode, zipCode) 
                    VALUES (@addressLine1, @addressLine2, @city, @stateCode, @zipCode)
                    RETURNING addressId
                `).get(req.body.shippingAddress)

                shippingAddress = newAddress.addressId
            }
        }
        else {
            let newAddress = db.prepare(`
                INSERT INTO Addresses (addressLine1, addressLine2, city, stateCode, zipCode) 
                VALUES (@addressLine1, @addressLine2, @city, @stateCode, @zipCode)
                RETURNING addressId
            `).get(req.body.shippingAddress)

            shippingAddress = newAddress.addressId
        }

        if (req.body.paymentMethod.hasOwnProperty('cardId')) {
            // Existing card, check it exists and if so, add it, if not make it and go
            let existingCard = db.prepare(`SELECT cardId FROM PaymentMethods WHERE cardId=@cardId`).get({cardId: req.body.paymentMethod.cardId})
            if (existingCard) paymentMethod = existingCard.cardId
            else {
                let newCard = db.prepare(`
                    INSERT INTO PaymentMethods (cardNumber, cardExpDate, cardCvv, cardCardholderName, billingAddress) 
                    VALUES (@cardNumber, @cardExpDate, @cardCvv, @cardCardholderName, @billingAddress)
                    RETURNING cardId
                `).get(req.body.paymentMethod)

                paymentMethod = newCard.cardId
            }
        }
        else {
            let newCard = db.prepare(`
                INSERT INTO PaymentMethods (cardNumber, cardExpDate, cardCvv, cardCardholderName, billingAddress) 
                VALUES (@cardNumber, @cardExpDate, @cardCvv, @cardCardholderName, @billingAddress)
                RETURNING cardId
            `).get(req.body.paymentMethod)

            paymentMethod = newCard.cardId
        }

        createOrderQuery.run({
            userId: userId,
            cartId: cartId,
            shippingAddress: shippingAddress,
            paymentMethod: paymentMethod
        })

        let createCartQuery = db.prepare(`INSERT INTO Carts DEFAULT VALUES RETURNING cartId`)

        let currentCartId = createCartQuery.get().cartId

        if (res.locals.user) {
            // Add new cart to user (old cart removed)
            db.prepare(`UPDATE Users SET activeCart=@activeCart WHERE userId=@userId`).run({activeCart: currentCartId, userId: res.locals.user})
        }
        
        res.cookie('activeCart', currentCartId, {maxAge: 9999999, httpOnly: false})
        res.status(201).send('success')
    }
    else res.status(400).send('Incomplete Body')
})

/************************************************************************************************************************************

    User Data

************************************************************************************************************************************/

/**
 * Create a new address in the database
 * @param {Address} addressData The data for the new address
 * @returns {Address|null} If successful, returns address, else returns null
 */
let createAddress = (addressData) => {
    let requiredFields = ['addressLine1', 'addressLine2', 'city', 'stateCode', 'zipCode']

    let insertAddressQuery = db.prepare(`
        INSERT INTO Addresses (addressLine1, addressLine2, city, stateCode, zipCode) 
        VALUES (@addressLine1, @addressLine2, @city, @stateCode, @zipCode)
        RETURNING addressId, addressLine1, addressLine2, city, stateCode, zipCode
    `)

    let transaction = db.transaction((address) => {
        return insertAddressQuery.get(address)
    })

    if (requiredFields.every(e => Object.keys(addressData).includes(e))) {
        try {
            return transaction(req.body)
        }
        catch (err) {
            console.error(err)
            return null
        }
    }
    else return null
}

router.get('/paymentMethods/:cardId', (req, res) => {
    let getPaymentMethodQuery = db.prepare(`
        SELECT P.cardNumber, P.cardExpDate, P.cardCvv, P.cardCardholderName, P.billingAddress, A.addressLine1, A.addressLine2, A.city, A.stateCode, A.zipCode
        FROM PaymentMethods P
        JOIN Addresses A
            ON P.billingAddress = A.addressId
        WHERE
            P.cardId = @cardId
    `)

    let cardData = getPaymentMethodQuery.get({cardId: req.params.cardId})

    if (cardData) res.send(cardData)
    else res.status(404).send('Not Found')
})

router.put('/paymentMethods/:cardId', (req, res) => {
    let getPaymentMethodQuery = db.prepare(`
        SELECT P.cardNumber, P.cardExpDate, P.cardCvv, P.cardCardholderName, P.billingAddress, A.addressLine1, A.addressLine2, A.city, A.stateCode, A.zipCode
        FROM PaymentMethods P
        JOIN Addresses A
            ON P.billingAddress = A.addressId
        WHERE
            P.cardId = @cardId
    `)

    let cardData = getPaymentMethodQuery.get({cardId: req.params.cardId})

    if (cardData) {
        let cardUpdateData = {
            cardNumber: req.body.cardNumber ? req.body.cardNumber : cardData.cardNumber,
            cardExpDate: req.body.cardExpDate ? req.body.cardExpDate : cardData.cardExpDate,
            cardCvv: req.body.cardCvv ? req.body.cardCvv : cardData.cardCvv,
            cardCardholderName: req.body.cardCardholderName ? req.body.cardCardholderName : cardData.cardCardholderName,
            billingAddress: req.body.billingAddress.addressId ? req.body.billingAddress.addressId : cardData.billingAddress,
            cardId: req.params.cardId
        }

        let addressUpdateData = {
            addressLine1: req.body.billingAddress.addressLine1 ? req.body.billingAddress.addressLine1 : cardData.addressLine1,
            addressLine2: req.body.billingAddress.addressLine2 || req.body.billingAddress.addressLine2 === '' ? req.body.billingAddress.addressLine2 : cardData.addressLine2,
            city: req.body.billingAddress.city ? req.body.billingAddress.city : cardData.city,
            stateCode: req.body.billingAddress.stateCode ? req.body.billingAddress.stateCode : cardData.stateCode,
            zipCode: req.body.billingAddress.zipCode ? req.body.billingAddress.zipCode : cardData.zipCode,
            addressId: req.body.billingAddress.addressId ? req.body.billingAddress.addressId : cardData.billingAddress,
        }

        console.log(req.body)

        db.prepare(`
            UPDATE Addresses 
            SET addressLine1 = @addressLine1,
            addressLine2 = @addressLine2,
            city = @city,
            stateCode = @stateCode,
            zipCode = @zipCode
            WHERE addressId = @addressId
        `).run(addressUpdateData)

        let updatedCardData = db.prepare(`
            UPDATE PaymentMethods 
            SET cardNumber = @cardNumber,
            cardExpDate = @cardExpDate,
            cardCvv = @cardCvv,
            cardCardholderName = @cardCardholderName,
            billingAddress = @billingAddress
            WHERE cardId = @cardId
            RETURNING cardNumber, cardExpDate, cardCvv, cardCardholderName, billingAddress
        `).get(cardUpdateData)

        res.status(204).send(updatedCardData)
    }
    else res.status(404).send('Not found')
})

router.post('/paymentMethods', (req, res) => {
    let requiredFields = ['cardNumber', 'cardExpDate', 'cardCvv', 'cardCardholderName', 'billingAddress']

    if (requiredFields.every(e => Object.keys(req.body).includes(e))) {
        let billingAddressData = req.body.billingAddress

        let insertPaymentMethodQuery = db.prepare(`
            INSERT INTO PaymentMethods (cardNumber, cardExpDate, cardCvv, cardCardholderName, billingAddress) 
            VALUES (@cardNumber, @cardExpDate, @cardCvv, @cardCardholderName, @billingAddress)
            RETURNING cardId, cardNumber, cardExpDate, cardCvv, cardCardholderName, billingAddress
        `)

        let transaction = db.transaction((address) => {
            return insertPaymentMethodQuery.get(address)
        })

        let address = db.prepare(`SELECT addressId FROM Addresses WHERE addressId = @addressId`).get(billingAddressData)

        if (! address) {
            let newAddress = createAddress(billingAddressData)
            if (! newAddress) res.status(400).send('Address Incomplete')
            else address = newAddress
        }

        let pmtMethodData = req.body
        pmtMethodData.billingAddress = address.addressId

        try {
            let newBillingMethod = transaction(pmtMethodData)
            if (res.locals.user) db.prepare(`INSERT INTO UserPaymentMethodRelations (userId, cardId) VALUES (@userId, @cardId)`).run({
                cardId: newBillingMethod.cardId,
                userId: res.locals.user
            })
            res.status(201).send(newBillingMethod)
        }
        catch {
            res.status(500).send("Something went wrong")
        }
    }
    else {
        res.status(400).send("Missing required field(s)")
    }
})

router.put('/paymentMethods', (req, res) => {
    db.prepare('UPDATE Users SET preferredCard = @cardId WHERE userId = @userId').run({cardId: req.body.cardId, userId: res.locals.user})
    res.cookie('activePaymentMethod', req.body.cardId, {maxAge: 9999999, httpOnly: false})
    res.status(204).send({activeCard: req.body.cardId})
})

router.put('/addresses', (req, res) => {
    db.prepare('UPDATE Users SET preferredAddress = @addressId WHERE userId = @userId').run({addressId: req.body.addressId, userId: res.locals.user})
    res.cookie('activeAddress', req.body.addressId, {maxAge: 9999999, httpOnly: false})
    res.status(204).send({activeAddress: req.body.addressId})
})

router.get('/addresses/:addressId', (req, res) => {
    let addressQuery = db.prepare('SELECT addressLine1, addressLine2, city, stateCode, zipCode FROM Addresses WHERE addressId = @addressId')
    let addressData = addressQuery.get({addressId: req.params.addressId})

    if (addressData) res.status(200).send(addressData)
    else res.status(404).send('Not found')
})

router.put('/addresses/:addressId', (req, res) => {
    let addressQuery = db.prepare('SELECT addressLine1, addressLine2, city, stateCode, zipCode FROM Addresses WHERE addressId = @addressId')
    let addressData = addressQuery.get({addressId: req.params.addressId})

    if (addressData) {
        let updateData = {
            addressLine1: req.body.addressLine1 ? req.body.addressLine1 : addressData.addressLine1,
            addressLine2: req.body.addressLine2 ? req.body.addressLine2 : addressData.addressLine2,
            city: req.body.city ? req.body.city : addressData.city,
            stateCode: req.body.stateCode ? req.body.stateCode : addressData.stateCode,
            zipCode: req.body.zipCode ? req.body.zipCode : addressData.zipCode,
            addressId: req.params.addressId
        }

        let updatedAddress = db.prepare(`
            UPDATE Addresses 
            SET addressLine1 = @addressLine1,
            addressLine2 = @addressLine2,
            city = @city,
            stateCode = @stateCode,
            zipCode = @zipCode
            WHERE addressId = @addressId
            RETURNING addressId, addressLine1, addressLine2, city, stateCode, zipCode
        `).get(updateData)

        res.status(204).send(updatedAddress)
    }
    else res.status(404).send('Not found')
})

router.post('/addresses', (req, res) => {
    let requiredFields = ['addressLine1', 'addressLine2', 'city', 'stateCode', 'zipCode']

    if (requiredFields.every(e => Object.keys(req.body).includes(e))) {
        let insertAddressQuery = db.prepare(`
            INSERT INTO Addresses (addressLine1, addressLine2, city, stateCode, zipCode) 
            VALUES (@addressLine1, @addressLine2, @city, @stateCode, @zipCode)
            RETURNING addressId, addressLine1, addressLine2, city, stateCode, zipCode
        `)

        let transaction = db.transaction((address) => {
            return insertAddressQuery.get(address)
        })

        try {
            let newAddress = transaction(req.body)

            if (res.locals.user) {
                let user = db.prepare(`SELECT userId FROM Users WHERE userId = @userId`).get({userId: res.locals.user})
                if (user) db.prepare(`INSERT INTO UserAddressRelations (userId, addressId) VALUES (@userId, @addressId)`).run({
                    userId: user.userId,
                    addressId: newAddress.addressId
                })
            }

            res.status(201).send(newAddress)
        }
        catch {
            res.status(500).send("Something went wrong")
        }
        
    }
    else {
        res.status(400).send("Missing required field(s)")
    }  
})


/************************************************************************************************************************************

    Login Routes

************************************************************************************************************************************/


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

        if (authCookie === undefined) res.cookie('loginToken', authData, {maxAge: 9999999, httpOnly: false})
        res.cookie('activeUser', res.locals.user, {maxAge: 9999999, httpOnly: false})
        if (res.locals.userAddress) res.cookie('activeAddress', res.locals.userAddress, {maxAge: 9999999, httpOnly: false})
        if (res.locals.userCard) res.cookie('activePaymentMethod', res.locals.userCard, {maxAge: 9999999, httpOnly: false})
       

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