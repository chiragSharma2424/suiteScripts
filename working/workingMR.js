/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/runtime", "N/log", "N/search", "N/record", "N/format"], 
function (runtime, log, search, record, format) {

  // ================= GET INPUT =================
  function getInputData() {

    var serialNo = runtime.getCurrentScript().getParameter({
      name: "custscript_serialno"
    });

    log.audit("Serial received from Suitelet", serialNo);

    if (!serialNo) return [];

    // 🔹 Find lotId
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

    if (!lotId) {
      log.audit("No lot found for serial", serialNo);
      return [];
    }

    // 🔹 Delete old custom records
    var deleteSearch = search.create({
      type: 'customrecord_serial_transactions',
      filters: [
        ['custrecordcustrecord_serial_no', 'is', serialNo]
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

    log.audit("Old records deleted", serialNo);

    return [{
      lotId: lotId,
      serialNo: serialNo
    }];
  }


  // ================= MAP =================
  function map(context) {

  var data = JSON.parse(context.value);
  var lotId = data.lotId;
  var serialNo = data.serialNo;

  var allTransactions = [];

  // ================= ITEM RECEIPT =================
  var receiptSearch = search.create({
    type: 'transaction',
    filters: [
      ['type', 'anyof', 'ItemRcpt'],
      'AND',
      ['inventorydetail.inventorynumber', 'anyof', lotId]
    ],
    columns: [
      'internalid',
      'tranid',
      'trandate',
      'location',
      'entity',
      'createdfrom',
      'item'
    ]
  });

  receiptSearch.run().each(function (r) {

    var obj = {
      type: "Item Receipt",
      internalId: r.id,
      tranId: r.getValue('tranid'),
      date: r.getValue('trandate'),
      location: r.getText('location'),
      entity: r.getText('entity'),
      createdFrom: r.getText('createdfrom'),
      item: r.getText('item')
    };

    allTransactions.push(obj);

    createCustomRecord(serialNo, obj);

    return true;
  });


  // ================= ITEM FULFILLMENT =================
  var fulfillmentSearch = search.create({
    type: 'transaction',
    filters: [
      ['type', 'anyof', 'ItemShip'],
      'AND',
      ['inventorydetail.inventorynumber', 'anyof', lotId]
    ],
    columns: [
      'internalid',
      'tranid',
      'trandate',
      'location',
      'entity',
      'createdfrom',
      'item'
    ]
  });

  fulfillmentSearch.run().each(function (r) {

    var obj = {
      type: "Item Fulfillment",
      internalId: r.id,
      tranId: r.getValue('tranid'),
      date: r.getValue('trandate'),
      location: r.getText('location'),
      entity: r.getText('entity'),
      createdFrom: r.getText('createdfrom'),
      item: r.getText('item')
    };

    allTransactions.push(obj);

    createCustomRecord(serialNo, obj);

    return true;
  });


  // ================= INVOICE =================
  var invoiceSearch = search.create({
    type: 'transaction',
    filters: [
      ['type', 'anyof', 'CustInvc'],
      'AND',
      ['inventorydetail.inventorynumber', 'anyof', lotId]
    ],
    columns: [
      'internalid',
      'tranid',
      'trandate',
      'location',
      'entity',
      'createdfrom',
      'item'
    ]
  });

  invoiceSearch.run().each(function (r) {

    var obj = {
      type: "Invoice",
      internalId: r.id,
      tranId: r.getValue('tranid'),
      date: r.getValue('trandate'),
      location: r.getText('location'),
      entity: r.getText('entity'),
      createdFrom: r.getText('createdfrom'),
      item: r.getText('item')
    };

    allTransactions.push(obj);

    createCustomRecord(serialNo, obj);

    return true;
  });

  // 🔥 ARRAY LOGGING (LIKE BEFORE BUT CLEAN)
  log.audit("All Transactions Found", JSON.stringify(allTransactions));
}



  // ================= HELPER FUNCTION =================
  function createCustomRecord(serialNo, tranType, internalId, tranDate, location) {

    var rec = record.create({
      type: "customrecord_serial_transactions",
      isDynamic: false
    });

    rec.setValue({
      fieldId: "name",
      value: serialNo + "_" + internalId
    });

    rec.setValue({
      fieldId: "custrecordcustrecord_serial_no",
      value: serialNo
    });

    rec.setValue({
      fieldId: "custrecord_custrecord_tran_type",
      value: tranType
    });

    rec.setValue({
      fieldId: "custrecord_custrecord_tran_internalid",
      value: internalId
    });

    // 🔥 DATE FIX (VERY IMPORTANT)
    if (tranDate) {

      var parsedDate = format.parse({
        value: tranDate,
        type: format.Type.DATE
      });

      rec.setValue({
        fieldId: "custrecord_custrecord_tran_date",
        value: parsedDate
      });
    }

    if (location) {
      rec.setValue({
        fieldId: "custrecord_custrecord_location",
        value: location
      });
    }

    var recId = rec.save();
    log.audit("Custom record created", recId);
  }


  // ================= SUMMARIZE =================
  function summarize(summary) {

    summary.mapSummary.errors.iterator().each(function (key, error) {
      log.error("Map Error for key: " + key, error);
      return true;
    });

    log.audit("Map/Reduce Completed");
  }


  return {
    getInputData: getInputData,
    map: map,
    summarize: summarize
  };

});
