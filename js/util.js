function renderIntAsMoneyString(val) {
    return `$${Math.floor(val/100) ? Math.floor(val/100) : ''}.${val % 100 ? (val % 100 < 10 ? "0" + val % 100 : val % 100) : '00'}`
}