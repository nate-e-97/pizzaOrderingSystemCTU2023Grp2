/**
 * When you add a new page, create a route for it on this page. 
 * The application will automatically use the path for the page once
 * the application is reloaded.
 */

const frontendRoutes = {
    "/about": "AboutUs.html",
    "/contact": "ContactUsPage.html",
    "/promos": "DAILY_PIZZA_SPECIALS.html"
}

/**
 * This router will generate the routes that the application will use
 */
const router = require('express').Router()
const path = require('path')

Object.keys(frontendRoutes).forEach(route => {
    router.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, frontendRoutes[route]))
    })
})

module.exports = router