async function getDataFromServer(path) {
    let serverData = await fetch(path)
    return await serverData.json()
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function eraseCookie(name) {   
    document.cookie = name+'=; Max-Age=-99999999;';  
}

function login() {
    // You can add authentication logic here (for example, check if username and password are valid)
    let username = $('#username').val();
    let password = $('#password').val();

    // HTTP authorization: Basic  atob(username:password)

    $.ajax({
        url: "/api/users/sessions",
        type: "POST",
        headers: {
            'authorization': `Basic ${btoa(username+":"+password)}`
        },
        success: function(res) {
            location.reload()
        },
        error: function(err) {
            alert('Login failed. Please check your username and password.');
        }
    })
}

function logout() {
    $.ajax({
        url: "/api/users/sessions",
        type: "DELETE",
        success: function(res) {
            eraseCookie('activePaymentMethod')
            eraseCookie('activeAddress')
            eraseCookie('activeCart')
            eraseCookie('editPizza')
            location.reload()
        },
        error: function(err) {
            alert('Logout failed.');
        }
    })
}

async function sendDataToServer(path, data, method="POST") {
    let headers = {
        "Content-Type": "application/json",
    }

    if (getCookie('loginToken')) {
        headers.authorization = decodeURIComponent(getCookie('loginToken'))
    }

    let req = await fetch(path, {
        method: method,
        headers: headers,
        body: JSON.stringify(data)
    })

    let reqData

    try {
        reqData = await req.json()
    }
    catch {
        reqData = {}
    }
    let reqStatus = req.status

    return {
        status: reqStatus,
        data: reqData
    }
}