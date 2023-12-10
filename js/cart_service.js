let cartData = []

async function populateCart() {
    if (!getCookie('activeCart')) await sendDataToServer('/api/users/carts', {})

    cartData = await getDataFromServer(`/api/users/carts/${getCookie('activeCart')}`)
}

async function deleteCart() {
    await sendDataToServer('/api/users/carts', {}, 'DELETE')
    await populateCart()
    renderCart()
}

let addItemToCart = async (itemDetails) => {
    let requiredFields = ['itemType', 'itemReference', 'size']

    if (requiredFields.every(e => Object.keys(itemDetails).includes(e))) {
        await sendDataToServer(`/api/users/carts/${getCookie('activeCart')}`, itemDetails);
        await populateCart()
        renderCart()
        renderCartCheckout()
    }
}

let updateCartItem = async (itemId, itemCount) => {
    await sendDataToServer(`/api/users/carts/${getCookie('activeCart')}`, {itemId: itemId, count: itemCount}, "PUT")
    await populateCart()
    renderCart()
    renderCartCheckout()
}

let renderCartCheckout = () => {
    let checkoutCart = document.getElementById('checkoutCartDisplay')
    checkoutCart.innerHTML = ''

    checkoutCart.innerHTML += `<ul class="list-group">`

    cartData.forEach( cartItem => {
        checkoutCart.innerHTML += `
        <li class="list-group-item">
            <div class="input-group mb-3">
                <span class="input-group-text">${cartItem.itemType == "MenuPizzas" ? cartItem.itemReference : "Custom Pizza, "+cartItem.size} - ${renderIntAsMoneyString(cartItem.price)}</span>
                <button type="button" class="btn btn-outline-secondary" onclick="updateCartItem(${cartItem.cartItemRelId}, ${cartItem.count-1})">-</button>
                <select class="form-select" onchange="updateCartItem(${cartItem.cartItemRelId}, this.value)">
                    <option value="1" ${cartItem.count == 1 ? "selected" : ''}>1</option>
                    <option value="2" ${cartItem.count == 2 ? "selected" : ''}>2</option>
                    <option value="3" ${cartItem.count == 3 ? "selected" : ''}>3</option>
                    <option value="4" ${cartItem.count == 4 ? "selected" : ''}>4</option>
                    <option value="5" ${cartItem.count == 5 ? "selected" : ''}>5</option>
                </select>
                ${cartItem.itemType == "CustomPizzas" ? "<a type='button' href='/editPizza/"+Math.floor(cartItem.itemReference)+"' class='btn btn-outline-secondary'><i class='bx bxs-edit-alt'></i></a>" : ""}
                ${cartItem.count<5 ? '<button type="button" class="btn btn-outline-secondary" onclick="updateCartItem('+cartItem.cartItemRelId+', '+cartItem.count+'+1)">+</button>' : ''}
            </div>
        </li>
        `
    })

    let subtotal = cartData.reduce((n, e) => n+(e.price*e.count), 0)

    checkoutCart.innerHTML += `</ul>
    <p>Subtotal: ${renderIntAsMoneyString(subtotal)}</p>
    `
}

let renderCart = () => {
    let cartModal = document.getElementById('cartModalItemDisplay')
    cartModal.innerHTML = ''

    cartModal.innerHTML += `<ul class="list-group">`

    cartData.forEach( cartItem => {
        cartModal.innerHTML += `
        <li class="list-group-item">
            <div class="input-group mb-3">
                <span class="input-group-text">${cartItem.itemType == "MenuPizzas" ? cartItem.itemReference : "Custom Pizza, "+cartItem.size} - ${renderIntAsMoneyString(cartItem.price)}</span>
                <button type="button" class="btn btn-outline-secondary" onclick="updateCartItem(${cartItem.cartItemRelId}, ${cartItem.count-1})">-</button>
                <select class="form-select" onchange="updateCartItem(${cartItem.cartItemRelId}, this.value)">
                    <option value="1" ${cartItem.count == 1 ? "selected" : ''}>1</option>
                    <option value="2" ${cartItem.count == 2 ? "selected" : ''}>2</option>
                    <option value="3" ${cartItem.count == 3 ? "selected" : ''}>3</option>
                    <option value="4" ${cartItem.count == 4 ? "selected" : ''}>4</option>
                    <option value="5" ${cartItem.count == 5 ? "selected" : ''}>5</option>
                </select>
                ${cartItem.itemType == "CustomPizzas" ? "<a type='button' href='/editPizza/"+Math.floor(cartItem.itemReference)+"' class='btn btn-outline-secondary'><i class='bx bxs-edit-alt'></i></a>" : ""}
                ${cartItem.count<5 ? '<button type="button" class="btn btn-outline-secondary" onclick="updateCartItem('+cartItem.cartItemRelId+', '+cartItem.count+'+1)">+</button>' : ''}
            </div>
        </li>
        `
    })

    let subtotal = cartData.reduce((n, e) => n+(e.price*e.count), 0)

    cartModal.innerHTML += `</ul>
    <p>Subtotal: ${renderIntAsMoneyString(subtotal)}</p>
    `

    document.getElementById('cartItemsCount').innerHTML = cartData.length
}