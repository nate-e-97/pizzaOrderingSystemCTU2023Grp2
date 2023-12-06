const router = require('express').Router()
const db = require('../db')

/**
 * Pizza
 * @typedef {object} Pizza
 * @property {string} name - Name of the pizza
 * @property {Array<string>} ingredients - Pizza ingredients, given as ingredient names
 * @property {number} price - Price of the pizza, in cents
 */

/**
 * Ingredient
 * @typedef {object} Ingredient
 * @property {string} ingredientName - The name of the ingredient
 * @property {number} extraCost - The cost of the ingredient, in cents
 * @property {string} ingredientType - The type of ingredient (crust, meat, veg, etc.)
 */

/**
 * PizzaDBResponse
 * @typedef {object} PizzaDBResponse
 * @property {string} pizzaName - Name of the pizza
 * @property {string} ingredientName - Name of an associated ingredient
 * @property {number} price - Price of the pizza
 */

/**
 * Coalesces list of pizzas and associated ingredients into an object
 * @param {Array<PizzaDBResponse>} pizzaResult List of pizzas from database
 * @returns Pizzas Object
 */
let coalescePizzas = (pizzaResult) => {
    let pizzaObj = {}

    pizzaResult.forEach( pizzaRow => {
        if (!pizzaObj.hasOwnProperty(pizzaRow.pizzaName)) pizzaObj[pizzaRow.pizzaName] = {ingredients: [], price: pizzaRow.price}
        pizzaObj[pizzaRow.pizzaName].ingredients.push(pizzaRow.ingredientName)
    })

    return pizzaObj
}

/**
 * GET /api/pizzas
 * @summary Endpoint to retrieve all premade pizzas
 * @tags pizzas
 * @return {array<Pizza>} 200 - success response - application/json
 */
router.get('/', (req, res) => {
    let menuPizzas = db.prepare(`
    SELECT P.pizzaName, I.ingredientName, P.price FROM MenuPizzas P
    JOIN MenuPizzaIngredientRelations PIRel 
        ON PIRel.pizzaName = P.pizzaName
    JOIN Ingredients I
        ON PIRel.ingredientName = I.ingredientName`)

    let pizzasList = []

    let pizzaData = coalescePizzas(menuPizzas.all())

    Object.keys(pizzaData).forEach( pizzaName => {
        pizzasList.push({
            name: pizzaName,
            ingredients: pizzaData[pizzaName].ingredients,
            price: pizzaData[pizzaName].price
        })
    })

    res.send(pizzasList)
})

/**
 * GET /api/pizzas/ingredients
 * @summary Endpoint to retrieve all pingredients
 * @tags pizzas
 * @return {array<Ingredient>} 200 - success response - application/json
 */
router.get('/ingredients', (req, res) => {
    let ingredientsList = db.prepare(`SELECT ingredientName, extraCost, ingredientType FROM Ingredients`)

    res.send(ingredientsList.all())
})

module.exports = router