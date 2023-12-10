// Database Initialization - uses local file db called local_database.db
const db = require('better-sqlite3')('local_database.db');
db.pragma('journal_mode = WAL');

class DBModel {
    /**
     * Helper object to make maintaining database definitions easier
     * @param {String} name Name of the table
     * @param {String} createFields Field definitions
     * @param {String} populateData Initial Data (should be SQL query)
     */
    constructor(name, createFields, populateData=null) {
        this.name = name

        this.create = `CREATE TABLE ${name} (
            ${createFields}
        );`

        let foreignRefs = createFields.match(/FOREIGN KEY/g)

        this.order = foreignRefs ? createFields.match(/FOREIGN KEY/g).length : 0

        this.populate = populateData
    }
}

const DB_DEF = [
    new DBModel('Users', 
    `
        userId INTEGER UNIQUE PRIMARY KEY,
        username varchar(255) UNIQUE,
        password varchar(255),
        -- hash varchar(255),
        -- salt varchar(255),
        firstName varchar(255),
        lastName varchar(255),
        phoneNumber varchar(11),
        activeCart INTEGER,
        preferredAddress INTEGER,
        preferredCard INTEGER,
        FOREIGN KEY (activeCart) REFERENCES Carts(cartId)
    `,
    `
        INSERT INTO Users (userId, username, password, firstName, lastName, phoneNumber, activeCart, preferredAddress, preferredCard) VALUES
        (1, 'admin', 'password', 'Admin', 'User', '1234567890', NULL, NULL, NULL),
        (2, 'test', 'password', 'Test', 'Customer', '1234567890', NULL, NULL, NULL)
    `),
    new DBModel('Addresses', 
    `
        addressLine1 varchar(255),
        addressLine2 varchar(255),
        city varchar(255),
        stateCode char(2),
        zipCode char(5),
        addressId INTEGER UNIQUE PRIMARY KEY
    `,
    `
        INSERT INTO Addresses (addressId, addressLine1, addressLine2, city, stateCode, zipCode) VALUES
        (1, '123 Main Street', 'Apt. 1', 'Denver', 'CO', '80014'),
        (2, '123 Main Street', 'Apt. 2', 'Denver', 'CO', '80014'),
        (3, '123 Main Street', 'Apt. 3', 'Denver', 'CO', '80014')
    `),
    new DBModel('UserAddressRelations', 
    `
        userId INTEGER,
        addressId varchar(255),
        FOREIGN KEY(userId) REFERENCES Users(userId),
        FOREIGN KEY(addressId) REFERENCES Addresses(addressId)
    `,
    `
        INSERT INTO UserAddressRelations (userId, addressId) VALUES
        (2, 1),
        (2, 3)
    `),
    new DBModel('PaymentMethods', 
    `
        cardNumber char(16),
        cardExpDate varchar(6),
        cardCvv char(3),
        cardCardholderName varchar(255),
        cardId INTEGER UNIQUE PRIMARY KEY,
        billingAddress INTEGER,
        FOREIGN KEY(billingAddress) REFERENCES Addresses(addressId)
    `,
    `
        INSERT INTO PaymentMethods (cardId, cardNumber, cardExpDate, cardCvv, cardCardholderName, billingAddress) VALUES
        (1, '1234123412341234', '12/2025', '123', 'Test Userman', 1)
    `),
    new DBModel('UserPaymentMethodRelations', 
    `
        userId INTEGER,
        cardId varchar(255),
        FOREIGN KEY(userId) REFERENCES Users(userId),
        FOREIGN KEY(cardId) REFERENCES PaymentMethods(cardId)
    `,
    `
        INSERT INTO UserPaymentMethodRelations (cardId, userId) VALUES
        (1, 2)
    `),
    new DBModel('Permissions', 
    `
        permissionName varchar(255) UNIQUE PRIMARY KEY
    `,
    `
        INSERT INTO Permissions (permissionName) VALUES
        ('Admin'),
        ('CancelOrder'),
        ('ModifyOrder'),
        ('EditMenu')
    `),
    new DBModel('UserPermissionRelations', 
    `
        userId INTEGER,
        permissionName varchar(255),
        FOREIGN KEY(userId) REFERENCES Users(userId),
        FOREIGN KEY(permissionName) REFERENCES Permissions(permissionName)
    `,
    `
        INSERT INTO UserPermissionRelations (userId, permissionName) VALUES
        (1, 'Admin')
    `),
    new DBModel('MenuPizzas', 
    `
        pizzaName varchar(255) UNIQUE PRIMARY KEY,
        price int
    `,
    `
        INSERT INTO MenuPizzas (pizzaName, price) VALUES
        ('Cheese Pizza', 899),
        ('Pepperoni Pizza', 999),
        ('Meat Lovers Pizza', 1299),
        ('Supreme Pizza', 1399),
        ('Pineapple Pizza', 899)
    `),
    new DBModel('Ingredients', 
    `
        ingredientName varchar(255) UNIQUE PRIMARY KEY,
        extraCost int,
        ingredientType varchar(20)
    `,
    `
        INSERT INTO Ingredients (ingredientName, extraCost, ingredientType) VALUES
        ('Pepperoni', 0, 'TOPPING'),
        ('Sausage', 0, 'TOPPING'),
        ('Peppers', 0, 'TOPPING'),
        ('Pineapple', 0, 'TOPPING'),
        ('Tomato Sauce', 0, 'SAUCE'),
        ('BBQ Sauce', 0, 'SAUCE'),
        ('Garlic Crust', 0, 'CRUST'),
        ('Thin Crust', 0, 'CRUST')
    `),
    new DBModel('MenuPizzaIngredientRelations', 
    `
        pizzaName varchar(255),
        ingredientName varchar(255),
        FOREIGN KEY(pizzaName) REFERENCES MenuPizzas(pizzaName),
        FOREIGN KEY(ingredientName) REFERENCES Ingredients(ingredientName)
    `,
    `
        INSERT INTO MenuPizzaIngredientRelations (pizzaName, ingredientName) VALUES
        ('Cheese Pizza', 'Garlic Crust'),
        ('Cheese Pizza', 'Tomato Sauce'),
        ('Pepperoni Pizza', 'Garlic Crust'),
        ('Pepperoni Pizza', 'Tomato Sauce'),
        ('Pepperoni Pizza', 'Pepperoni'),
        ('Meat Lovers Pizza', 'Garlic Crust'),
        ('Meat Lovers Pizza', 'Pepperoni'),
        ('Meat Lovers Pizza', 'Sausage'),
        ('Pineapple Pizza', 'Thin Crust'),
        ('Pineapple Pizza', 'Pineapple'),
        ('Pineapple Pizza', 'BBQ Sauce'),
        ('Supreme Pizza', 'Garlic Crust'),
        ('Supreme Pizza', 'Tomato Sauce'),
        ('Supreme Pizza', 'Pepperoni'),
        ('Supreme Pizza', 'Sausage'),
        ('Supreme Pizza', 'Peppers')
    `),
    new DBModel('CustomPizzas', 
    `
        pizzaId INTEGER UNIQUE PRIMARY KEY
    `,
    `
        INSERT INTO CustomPizzas (pizzaId) VALUES (0)
    `),
    new DBModel('CustomPizzaIngredientRelations', 
    `
        pizzaId varchar(255),
        ingredientName varchar(255),
        FOREIGN KEY(pizzaId) REFERENCES CustomPizzas(pizzaId),
        FOREIGN KEY(ingredientName) REFERENCES Ingredients(ingredientName)
    `),
    new DBModel('Carts', 
    `
        cartId INTEGER UNIQUE PRIMARY KEY
    `),
    new DBModel('CartDynamicItemRelations', 
    `
        cartItemRelId INTEGER UNIQUE PRIMARY KEY,
        itemType varchar(255),
        itemReference varchar(255),
        count INTEGER,
        price INTEGER,
        size varchar(3),
        cartId varchar(255),
        FOREIGN KEY(cartId) REFERENCES Carts(cartId)
    `,
    `
        INSERT INTO CartDynamicItemRelations (cartItemRelId) VALUES (0)
    `),
    new DBModel('Orders', 
    `
        userId INTEGER,
        paymentMethod INTEGER,
        shippingAddress INTEGER,
        cartId INTEGER,
        orderId INTEGER UNIQUE PRIMARY KEY,
        -- promoId INTEGER,
        FOREIGN KEY (userId) REFERENCES Users(userId),
        FOREIGN KEY (paymentMethod) REFERENCES PaymentMethods(cardId),
        FOREIGN KEY (cartId) REFERENCES Carts(cartId)
        -- FOREIGN KEY (promoId) REFERENCES Promotions(promoId)
    `,
    `
        INSERT INTO Orders (orderId) VALUES (0)
    `),
    new DBModel('Promotions', 
    `
        promoId INTEGER UNIQUE PRIMARY KEY,
        startDate date,
        endDate date,
        description varchar(255),
        price INTEGER,
        promoCode varchar(255)
    `,
    `
        INSERT INTO Promotions (promoId, startDate, endDate, description, price, promoCode) VALUES
        (1, '1/1/2023', '1/1/2024', '1 Slice of Pizza, 1 Topping, & 1 Large Soda', 599, 'SPECIAL1'),
        (2, '1/1/2023', '1/1/2024', '2 Slices of Pizza, 1 Topping, & 1 Large Soda', 899, 'SPECIAL2'),
        (3, '1/1/2023', '1/1/2024', '2 Medium, 2 Topping Pizzas', 2299, 'SPECIAL3')
    `),
]

let tableList = db.prepare(`
SELECT name FROM sqlite_schema
WHERE type = 'table' 
  AND name NOT LIKE 'sqlite_%';
`).all();

console.info(`Initializing database...`)

console.info(`Current tables: ${tableList.map(e => e.name).join(', ')}`)

DB_DEF.sort((a, b) => a.order - b.order)

DB_DEF.forEach( dbModel => {
    console.info(`Initializing ${dbModel.name} table...`)
    if (! tableList.map(e => e.name).includes(dbModel.name)) {

        console.info(`Table doesn't exist, creating...`)
        let createScript = db.prepare(dbModel.create);

        let create = db.transaction(() => createScript.run())

        create()

        if (dbModel.populate && dbModel.populate.length > 0) {
            console.info(`Initializing table data...`)
    
            let populateScript = db.prepare(dbModel.populate);
    
            let populate = db.transaction(() => populateScript.run())
    
            populate()
        }
    }

    console.info(`Done!`)
})

module.exports = db