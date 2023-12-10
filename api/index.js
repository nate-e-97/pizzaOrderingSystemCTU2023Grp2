const router = require('express').Router()

router.use('/users', (require('./user')))
router.use('/pizzas', (require('./pizza')))

module.exports = router