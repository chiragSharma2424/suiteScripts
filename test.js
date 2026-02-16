 var filters = [
                ['mainline', 'is', 'F'],
                'AND',
                ['inventorydetail.inventorynumber', 'is']
            ]
let ans = filters.map((item) => {
    return item
});
console.log(`map output: ${ans}`)


let ans2 = filters.reduce((item) => {
    return item
});
console.log(`reduce output: ${ans2}`)