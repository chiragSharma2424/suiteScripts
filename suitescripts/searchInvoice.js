    /** @NApiVersion 2.1 */
    const invoiceSearchObj = search.create({
    type: "invoice",
    settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
    filters:
    [
        ["type","anyof","CustInvc"], 
        "AND", 
        ["custcol_invdetail","startswith","LPB2BNBSU14606"], 
        "AND", 
        ["mainline","is","F"], 
        "AND", 
        ["taxline","is","F"]
    ],
    columns:
    [
        search.createColumn({name: "custcol_invdetail", label: "Serial Number"}),
        search.createColumn({name: "entity", label: "Name"}),
        search.createColumn({name: "item", label: "Item"}),
        search.createColumn({name: "trandate", label: "Date"}),
        search.createColumn({name: "type", label: "Type"}),
        search.createColumn({name: "location", label: "Location"}),
        search.createColumn({
            name: "inventorynumber",
            join: "inventoryDetail",
            label: " Number"
        }),
        search.createColumn({name: "internalid", label: "Internal ID"})
    ]
    });
    const searchResultCount = invoiceSearchObj.runPaged().count;
    log.debug("invoiceSearchObj result count",searchResultCount);
    invoiceSearchObj.run().each(function(result){
    // .run().each has a limit of 4,000 results
    return true;
    });

    /*
    invoiceSearchObj.id="customsearch1770023202098";
    invoiceSearchObj.title="invoice search by serial no (copy)";
    const newSearchId = invoiceSearchObj.save();
    */