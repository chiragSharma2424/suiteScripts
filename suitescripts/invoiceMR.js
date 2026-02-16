/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/runtime", "N/log", "N/search", "N/record"], function(runtime, log, search, record) {
  // getting serial no from suite let
  function getInputData() {
    var serialNo = runtime.getCurrentScript().getParameter({
      name: "custscript_serialno",
    });

    log.debug("serial no: ", serialNo);
    log.audit("Serial received from Suitelet", serialNo);

    return search.create({
      type: search.Type.TRANSACTION,
      settings: [
        { name: "consolidationtype", value: "ACCTTYPE" },
        { name: "includeperiodendtransactions", value: "F" },
      ],
      filters: [
        // here we are finding or searching invoice, item receipt, item fulfillment by serial no
        ["type", "anyof", ["CustInvc", "ItemRcpt", "ItemShip"]],
        "AND",
        ["custcol_invdetail", "startswith", serialNo],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["taxline", "is", "F"],
      ],
      columns: [
        "tranid",
        "trandate",
        "type",
        "entity",
        "item",
        "itemtype",
        "location",
        "custcol_invdetail",
      ],
    });
  }

  function map(context) {
    var result = JSON.parse(context.value);

    var internalId = result.id;

  var tranNo     = result.values.tranid;
  var tranDate   = result.values.trandate;
  var tranType   = result.values.type?.text;   // Invoice / Item Receipt / Item Fulfillment

  var customer   = result.values.entity?.text;

  var itemText   = result.values.item?.text;
  var itemId     = result.values.item?.value;
  var itemType   = result.values.itemtype?.text;

  var location   = result.values.location?.text;
  var serialNo   = result.values.custcol_invdetail

    log.debug("Transaction Found", {
      internalId: internalId,
      tranNo: tranNo,
      tranType: tranType,
      tranDate: tranDate,
      customer: customer,
      itemText: itemText,
      itemId: itemId,
      itemType: itemType,
      location: location,
      serialNo: serialNo
    })

    // writing into custom record
    var rec = record.create({
      type: "customrecordcustomrecord_serial_invoice_",
      isDynamic: false,
    });

    rec.setValue({
      fieldId: "name",
      value: "Serial - " + serialNo,
    });


    rec.setValue({
      fieldId: "custrecordcustrecord_serialno",
      value: serialNo,
    });

    rec.setValue({
      fieldId: "custrecordcustrecord_location",
      value: location
    });

    rec.setValue({
      fieldId: "custrecordcustrecord_item",
      value: itemText
    });

    rec.setValue({
      fieldId: "custrecordcustrecord_tran_type",
      value: tranType
    });

    rec.setValue({
      fieldId: "custrecordcustrecord_tran_number",
      value: tranNo
    });

    rec.setValue({
      fieldId: "custrecordcustrecord_tran_date",
      value: tranDate
    });

    rec.setValue({
      fieldId: "custrecordcustrecord_tran_internalid",
      value: internalId
    });


    var recId = rec.save();
    log.audit("Custom record row created: ", recId);
  }


  function reduce(context) {
    try {

    } catch(error) {
      log.debug("error: ", error);
    }
  }

  function summarize(context) {
    try {

    } catch(error) {
      log.debug("error: ", error);
    }
  }

  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize,
  };
});