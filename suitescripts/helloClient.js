/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define([], function () {

    function pageInit(context) {
        // page init
    }

    function fieldChanged(context) {
        var employee = context.currentRecord;

        if(context.fieldId == 'phone') {
            var fax = employee.getValue('fax');

        }
    }

    function saveRecord(context) {
        // before save
        return true;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});
