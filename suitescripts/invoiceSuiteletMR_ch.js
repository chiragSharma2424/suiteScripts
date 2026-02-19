/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/ui/serverWidget", "N/task", "N/log", "N/search", "N/redirect", "N/runtime"], 
function (ui, task, log, search, redirect, runtime) {

  function onRequest(context) {

    var request = context.request;
    var response = context.response;
    var taskId = request.parameters.taskid || null;
    var srno =   request.parameters.custpage_serial || ' ';

    log.debug("srno: ", srno);
    log.debug("task id: ", taskId);
    var taskStatus = null;
    if (taskId) {
        taskStatus = task.checkStatus({ taskId: taskId });
     }

    log.debug("task status: ", taskStatus);

    // ---------------- CREATE FORM ----------------
    var form = ui.createForm({
      title: "Send Serial to Map/Reduce"
    });

    var serialField = form.addField({
      id: "custpage_serial",
      type: ui.FieldType.TEXT,
      label: "Serial Number"
    });

    serialField.defaultValue = srno;

    form.addSubmitButton({
      label: "Send"
    });
    if (taskStatus &&
                (taskStatus.status === task.TaskStatus.PENDING ||
                 taskStatus.status === task.TaskStatus.PROCESSING)) {

                var status = form.addField({
                    id: 'custpage_status',
                    type: ui.FieldType.INLINEHTML,
                    label: ' '
                });

                status.defaultValue = `
                    <div style="padding:8px;background:#fff3cd;border:1px solid #ffeeba;color:#856404;">
                        ⏳ Processing... page will auto-refresh.
                    </div>
                    <script>setTimeout(function(){location.reload();},4000);</script>
                `;
            }
    if(taskId && taskStatus.status === task.TaskStatus.COMPLETE) {
       showResults(form, srno);
       log.debug("Task Status", "COMPLETED");
    }


    // ---------------- POST → RUN MAP REDUCE ----------------
    if (request.method === "POST" && srno) {

      try {

        var mrTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: "customscript_invoicemrch",
          deploymentId: "customdeploy_invoicemrch",
          params: {
            custscript_serialno: srno
          }
        });

        var taskId = mrTask.submit();
        
         log.audit("MR Triggered", {
          serial: srno,
          taskId: taskId
        });
        redirect.toSuitelet({
          scriptId: runtime.getCurrentScript().id,
          deploymentId: runtime.getCurrentScript().deploymentId,
          parameters: {
            taskid: taskId,
            custpage_serial: request.parameters.custpage_serial
          }
        });

       

      } catch (e) {

        if (e.name === "MAP_REDUCE_ALREADY_RUNNING") {
          log.debug("Map/Reduce already running");
        } else {
          throw e;
        }
      }
    }


    // functtion defintion

    function showResults(form, srno) {

  if (!srno) return;

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
    type: "customrecord_serial_transactions",
    filters: [
      ["custrecordcustrecord_serial_no","startswith", srno]
    ],
    columns:
   [
      search.createColumn({name: "custrecordcustrecord_serial_no", label: "Serial No"}),
      search.createColumn({name: "custrecord_custrecord_tran_date", label: "Transaction Date"}),
      search.createColumn({name: "custrecord_custrecord_tran_type", label: "Transaction Type"})
   ]
  });
       const searchResultCount = resultSearch.runPaged().count;
       log.debug("resultSearch result count",searchResultCount);
      var i=0;
       resultSearch.run().each(function(result){
              var tdt =     result.getValue('custrecord_custrecord_tran_date');
              var serialNo = result.getValue('custrecordcustrecord_serial_no');
              var tranType = result.getValue('custrecord_custrecord_tran_type');
         
              log.debug('tdt ',tdt);
              log.debug("srno: ", serialNo);
         
               if (tdt) {
                     sublist.setSublistValue({
                      id: "col_date",
                      line: i,
                      value: tdt
                    });
               }
         
               if(serialNo) {
                 sublist.setSublistValue({
                   id: "col_serial",
                   line: i,
                   value: srno
                 });
               }
         if(tranType) {
           sublist.setSublistValue({
             id: "col_type",
             line: i,
             value: tranType
           })
         }
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
