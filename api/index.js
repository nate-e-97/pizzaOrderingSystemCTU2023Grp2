const router = require('express').Router()

router.use('/users', (require('./user')))
router.use('/pizzas', (require('./pizza')))
router.use('/promos', (require('./promo')))

module.exports = router