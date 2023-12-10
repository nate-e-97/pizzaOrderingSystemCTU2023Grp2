/**
 * When you add a new page, create a route for it on this page. 
 * The application will automatically use the path for the page once
 * the application is reloaded.
 */

const frontendRoutes = {
    "/": "frontend.ejs",
    "/about": "AboutUs.ejs",
    "/contact": "ContactUsPage.ejs",
    "/promos": "DAILY_PIZZA_SPECIALS.ejs",
    "/checkout": "checkout.ejs",
    // "/register": "register.ejs"
    // "/login": "loginPage.ejs"
}

/**
 * This router will generate the routes that the application will use
 */
const router = require('express').Router()

Object.keys(frontendRoutes).forEach(route => {
    router.get(route, (req, res) => {
        res.render('index', {
            pageName: frontendRoutes[route]
        })
    })
})

router.get('/register', (req, res) => {
    if (res.locals.user) res.redirect('/login')
    else res.render('index', {
        pageName: 'register.ejs'
    })
})

router.get('/editPizza/menu', (req, res) => {
    if (res.locals.isAdmin) res.render('index', {
        pageName: 'editMenu.ejs'
    })
    else res.redirect('/')
})

router.get('/editPizza/ingredients', (req, res) => {
    if (res.locals.isAdmin) res.render('index', {
        pageName: 'editIngredients.ejs'
    })
    else res.redirect('/')
})


router.get('/editPizza/:pizzaId', (req, res) => {
    const db = require('./db')

    let existingPizza = db.prepare('SELECT pizzaId FROM CustomPizzas WHERE pizzaId=@pizzaId').get({pizzaId: req.params.pizzaId})

    if (existingPizza) {
        res.cookie('editPizza', existingPizza.pizzaId, {maxAge: 9999999, httpOnly: false})
        res.render('index', {
            pageName: 'customPizzaForm.ejs'
        })
    }
    else {
        res.redirect('/')
    }
})

router.get('/login', (req, res) => {
    if (res.locals.user) {
        res.render('index', {
            pageName: 'accountPage.ejs'
        })
    }
    else {
        res.render('index', {
            pageName: 'loginPage.ejs'
        })
    }
})

module.exports = router