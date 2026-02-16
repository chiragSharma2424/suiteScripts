/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/log'], function (log) {
    function afterSubmit(context) {
        // log.debug("Hello world")
        var employee = context.newRecord;
        var superVisorName = context.getText('supervisor');
    }

    return {
        afterSubmit: afterSubmit,
    }
}); 