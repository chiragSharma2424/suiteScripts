/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(["N/ui/serverWidget", "N/task", "N/log"], function (serverwidget, task, log) {
  function onRequest(context) {
    try {
      var request = context.request;

      if (request.method === "POST") {
        var serial = request.parameters.custpage_serial;

        var mrTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: "customscript_logserialmr",
          deploymentId: "customdeploy_logserialmr", 
          params: {
            custscript_serial_no: serial,
          },
        });

        mrTask.submit();
      }

      var form = serverwidget.createForm({
        title: "Logging serial no",
      });

      form.addField({
        id: "custpage_serial",
        type: serverwidget.FieldType.TEXT,
        label: "Serial Number",
      });

      form.addSubmitButton({
        label: "Send to Map/Reduce",
      });
      context.response.writePage(form);
      
    } catch (error) {
      log.debug("error: ", error);
    }
  }

  return {
    onRequest: onRequest,
  };
});
