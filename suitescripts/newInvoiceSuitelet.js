/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(["N/ui/serverWidget", "N/search"], function (ui, search) {
  function onRequest(context) {
    var req = context.request;
    var res = context.response;

    var form = ui.createForm({
      title: "Invoice Lookup by serial Number",
    });

    // Serial Number input field
    var serialFld = form.addField({
      id: "custpage_serial",
      type: ui.FieldType.TEXT,
      label: "Serial Number",
    });

    serialFld.isMandatory = true;

    var sublist = form.addSublist({
      id: "custpage_results",
      type: ui.sublistType.LIST,
      label: "Invoice Results",
    });

    sublist.addField({
      id: "col_serial",
      type: ui.FieldType.TEXT,
      label: "Serial Number",
    });

    sublist.addField({
      id: "col_customer",
      type: ui.FieldType.TEXT,
      label: "Customer",
    });

    sublist.addField({
      id: "col_location",
      type: ui.FieldType.TEXT,
      label: "Location",
    });

    sublist.addField({
      id: "col_item",
      type: ui.FieldType.TEXT,
      label: "Item",
    });

    if (req.method === "POST") {
      var serial = req.parameters.custpage_serial;

      serialFld.defaultValue = serial;

      var invoiceSearchObj = search.create({
        type: "invoice",
        filters: [
          ["type", "anyof", "CustInvc"],
          "AND",
          ["mainline", "is", "F"],
          "AND",
          ["serialnumbers", "contains", serial],
        ],
        columns: [
          search.createColumn({ name: "serialnumbers" }),
          search.createColumn({ name: "entity" }),
          search.createColumn({ name: "trandate" }),
          search.createColumn({ name: "location" }),
          search.createColumn({ name: "item" }),
        ],
      });
      var line = 0;

      invoiceSearchObj.run().each(function (result) {
        sublist.setSublistValue({
          id: "col_serial",
          line: line,
          value: result.getValue("serialnumber") || "",
        });

        sublist.setSublistValue({
          id: "col_customer",
          line: line,
          value: result.getText("entity") || "",
        });

        sublist.setSublistValue({
          id: "col_date",
          line: line,
          value: result.getValue("trandate"),
        });

        sublist.setSublistValue({
          id: "col_location",
          line: line,
          value: result.getText("location") || "",
        });

        sublist.setSublistValue({
          id: "col_item",
          line: line,
          value: result.getText("item") || "",
        });
        line++;
        return true;
      });
    }

    form.addSubmitButton({
      label: "search",
    });

    res.writePage(form);
  }

  return {
    onRequest: onRequest,
  };
});
