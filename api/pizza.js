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

router.post('/', (req, res) => {
    if (! res.locals.isAdmin) res.status(403).send('Forbidden')

    db.prepare('DELETE FROM MenuPizzaIngredientRelations').run()
    db.prepare('DELETE FROM MenuPizzas').run()

    let pizzasList = []
    let relList = []

    req.body.forEach( pizzaMenuItem => {
        pizzasList.push({
            pizzaName: pizzaMenuItem.name,
            price: pizzaMenuItem.price,
        })
        pizzaMenuItem.ingredients.forEach( ingredient => {
            relList.push({
                pizzaName: pizzaMenuItem.name,
                ingredientName: ingredient
            })
        })
    })

    let insertPizzasQuery = db.prepare(`
        INSERT INTO MenuPizzas (pizzaName, price) VALUES (@pizzaName, @price);
    `)

    let insertRelQuery = db.prepare(`
        INSERT INTO MenuPizzaIngredientRelations (pizzaName, ingredientName) VALUES (@pizzaName, @ingredientName);
    `)

    pizzasList.forEach( menuPiece => {
        insertPizzasQuery.run(menuPiece)
    })

    relList.forEach( relPiece => {
        insertRelQuery.run(relPiece)
    })

    res.status(204).send('No Content')
})

router.post('/ingredients', (req, res) => {
    if (! res.locals.isAdmin) res.status(403).send('Forbidden')

    let insertIngredientQuery = db.prepare(`
        INSERT INTO Ingredients (ingredientName, extraCost, ingredientType) VALUES (@ingredientName, @extraCost, @ingredientType)
    `)

    let updateIngredientQuery = db.prepare(`
        UPDATE Ingredients SET 
            extraCost=@extraCost, 
            ingredientType=@ingredientType
        WHERE ingredientName=@ingredientName
    `)

    req.body.forEach( ingredient => {
        if (db.prepare(`SELECT ingredientName FROM Ingredients WHERE ingredientName=@ingredientName`).get({ingredientName: ingredient.ingredientName})) {
            updateIngredientQuery.run(ingredient)
        }
        else {
            insertIngredientQuery.run(ingredient)
        }
    })

    res.status(204).send('No Content')
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