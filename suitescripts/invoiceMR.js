/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/runtime", "N/log", "N/search", "N/record"], function (runtime, log, search, record) {

  // getting serial no from suite let
  function getInputData() {
    var serialNo = runtime.getCurrentScript().getParameter({
      name: "custscript_serialno",
    });

    // logging serial number
    log.debug("getInputData started");
    log.debug("serial no: ", serialNo);
    log.audit("Serial received from Suitelet", serialNo);


    // finding lotId for that serial number and passing to map function
    var lotId;
    var lotSearch = search.create({
      type: 'inventorynumber',
      filters: [['inventorynumber', 'is', serialNo]],
      columns: ['internalid']
    });
    lotSearch.run().each(function (r) {
      lotId = r.getValue('internalid');
      return false;
    });
    log.debug('lotId', lotId);
    if (!lotId) {
      return { message: "No inventory number record found for " + serialNo };
    }


    // Deleting our old custom records
    // Result: There are no duplicate entries, because you always delete the old ones before inserting new ones.

   /* var deleteSearch = search.create({
      type: 'customrecord_serial_transactions',
      filters: [
        ['custrecordcustrecord_serial_no', 'is', serialNo] // make sure this is exact internal ID
      ],
      columns: ['internalid']
    });

    deleteSearch.run().each(function (r) {
      record.delete({
        type: 'customrecord_serial_transactions',
        id: r.getValue('internalid')
      });
      return true;
    });

    log.audit("Old custom records deleted for serial no", serialNo);

*/
    return [{
      lotId: lotId,
      serialNo: serialNo
    }];
  }


  function map(context) {
    var data = JSON.parse(context.value); // parse the JSON object
    var lotId = data.lotId;
    var serialNo = data.serialNo;

    var transactions = [];
    var invoices = [];
    var fulfillments = [];

    var allTransactions = [];

    log.debug("map started")
    log.debug("Processing lotId: ", lotId);

    // search for item receipt
    var receiptSearch = search.create({
      type: 'transaction',
      filters: [
        ['type', 'anyof', 'ItemRcpt'],
        'AND',
        ['inventorydetail.inventorynumber', 'anyof', lotId]
      ],
      columns: [
        'internalid',
        'type',
        'tranid',
        'trandate',
        'createdfrom',
        'entity',
        'item',
        'location'
      ]
    });

    //log.debug("Item receipt search results: ", receiptSearch);

    receiptSearch.run().each(function (r) {
      transactions.push({
        type: r.getValue('type'),
        internalId: r.getValue('internalid'),
        tranId: r.getValue('tranid'),
        tranDate: r.getValue('trandate'),
        createdFrom: r.getText('createdfrom'),
        party: r.getText('entity'),
        item: r.getText('item'),
      });
      return true;
    });


    // pushing item receipt in all transactions array
    receiptSearch.run().each(function (r) {
      allTransactions.push(
        "Item Receipt - " +
        r.getValue('tranid') +
        " - " +
        r.getValue('trandate')
      );
      return true;
    });


    log.debug("Item receipt found: ", transactions);



    // searching for item fulfillment
    var fulfillmentSearch = search.create({
      type: 'transaction',
      filters: [
        ['type', 'anyof', 'ItemShip'], 'AND',
        ['inventorydetail.inventorynumber', 'anyof', lotId]
      ],
      columns: [
        'internalid',   // Transaction internal ID
        'tranid',       // Document number
        'trandate',     // Date
        'createdfrom',  // Related sales order
        'entity',       // Customer
        'item',
        'location',
        'type'
      ]
    });


    fulfillmentSearch.run().each(function (r) {
      fulfillments.push({
        type: r.getValue('type'),
        internalId: r.getValue('internalid'),
        tranId: r.getValue('tranid'),
        tranDate: r.getValue('trandate'),
        createdFrom: r.getText('createdfrom'),
        party: r.getText('entity'),
        item: r.getText('item'),
        location: r.getText('location')
      });
      return true;
    });


    // pushing item fulfillment in all transactions array
    fulfillmentSearch.run().each(function (r) {
      allTransactions.push(
        "Item Fulfillment - " +
        r.getValue('tranid') +
        " - " +
        r.getValue('trandate')
      );
      return true;
    });

    log.debug("Fullfillments found: ", fulfillments);



    // search for invoices
    var invoiceSearch = search.create({
      type: 'transaction',
      filters: [
        ['type', 'anyof', 'CustInvc'], 'AND',
        ['inventorydetail.inventorynumber', 'anyof', lotId]
      ],
      columns: ['tranid', 'trandate', 'entity', 'item', 'itemType', 'serialNumber', 'type']
    });

    // log.debug("Invoice result: ", invoiceSearch);

    invoiceSearch.run().each(function (r) {
      invoices.push({
        type: r.getValue('type'),
        tranId: r.getValue('tranid'),
        tranDate: r.getValue('trandate'),
        party: r.getText('entity'),
        item: r.getText('item'),
        itemType: r.getValue('itemType'),
        serialNumber: r.getValue('serialNumber')
      });
      return true;
    });


    // pushing invoices in all transactions array
    invoiceSearch.run().each(function (r) {
      allTransactions.push(
        "Invoice - " +
        r.getValue('tranid') +
        " - " +
        r.getValue('trandate')
      );
      return true;
    });


    log.debug("Invoice found: ", invoices)
    log.debug("Serial no in map: ", serialNo);


    // logging all transaction array of IR, IF, Invoice
    log.debug("All transactions array: ", allTransactions);




    // creating custom record 
    var rec = record.create({
      type: "customrecord_serial_transactions",
      isDynamic: false
    });


    rec.setValue({ fieldId: "name", value: serialNo });

    rec.setValue({ fieldId: "custrecordcustrecord_serial_no", value: serialNo });

    
    // setting all transactions here 
    rec.setValue({
      fieldId: "custrecord_all_tran",
      value: allTransactions
    })

    var recId = rec.save();
    log.audit("Custom record saved", recId);
  }



  return {
    getInputData: getInputData,
    map: map
  }
});