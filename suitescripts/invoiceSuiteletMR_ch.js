/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/ui/serverWidget", "N/task", "N/log", "N/search"], 
function (ui, task, log, search) {

  function onRequest(context) {

    var request = context.request;
    var response = context.response;
    var serial = request.parameters.custpage_serial || '';

    // ---------------- CREATE FORM ---------------- //
    var form = ui.createForm({
      title: "Send Serial to Map/Reduce"
    });

    var serialField = form.addField({
      id: "custpage_serial",
      type: ui.FieldType.TEXT,
      label: "Serial Number"
    });

    serialField.defaultValue = serial;

    form.addSubmitButton({
      label: "Send"
    });

    // ---------------- POST → RUN MAP REDUCE ---------------- // 
    if (request.method === "POST" && serial) {

      try {
        var mrTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: "customscript_invoicemrch",
          deploymentId: "customdeploy_invoicemrch",
          params: {
            custscript_serialno: serial
          }
        });

        var taskId = mrTask.submit();

        log.audit("MR Triggered", {
          serial: serial,
          taskId: taskId
        });

      } catch (e) {
        log.debug("error", e);
      }
    }

    // ---------------- SHOW RESULTS ------------- //  
    if (serial) {

      var sublist = form.addSublist({
        id: "custpage_results",
        type: ui.SublistType.LIST,
        label: "Transaction Results"
      });

      sublist.addField({
        id: "col_serial",
        type: ui.FieldType.TEXT,
        label: "Serial"
      });

      sublist.addField({
        id: "col_type",
        type: ui.FieldType.TEXT,
        label: "Transaction Type"
      });

      sublist.addField({
        id: "col_number",
        type: ui.FieldType.TEXT,
        label: "Transaction Number"
      });

      sublist.addField({
        id: "col_date",
        type: ui.FieldType.DATE,
        label: "Transaction Date"
      });

      sublist.addField({
        id: "col_location",
        type: ui.FieldType.TEXT,
        label: "Location"
      });

      var resultSearch = search.create({
        type: "customrecordcustomrecord_serial_invoice_",
        filters: [
          ["custrecordcustrecord_serialno", "is", serial]
        ],
        columns: [
          "custrecordcustrecord_serialno",
          "custrecordcustrecord_tran_type",
          "custrecordcustrecord_tran_number",
          "custrecordcustrecord_tran_date",
          "custrecordcustrecord_location"
        ]
      });

      var i = 0;

      resultSearch.run().each(function(result) {

        sublist.setSublistValue({
          id: "col_serial",
          line: i,
          value: result.getValue("custrecordcustrecord_serialno") || ""
        });

        sublist.setSublistValue({
          id: "col_type",
          line: i,
          value: result.getValue("custrecordcustrecord_tran_type") || ""
        });

        sublist.setSublistValue({
          id: "col_number",
          line: i,
          value: result.getValue("custrecordcustrecord_tran_number") || ""
        });

        var dateVal = result.getValue("custrecordcustrecord_tran_date");
        if (dateVal) {
          sublist.setSublistValue({
            id: "col_date",
            line: i,
            value: dateVal
          });
        }

        sublist.setSublistValue({
          id: "col_location",
          line: i,
          value: result.getValue("custrecordcustrecord_location") || ""
        });
        i++;
        return true;
      });
    }

    response.writePage(form);
  }

  return {
    onRequest: onRequest
  };
});