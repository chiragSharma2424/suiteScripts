/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define([], function() {

   function pageInit(context) {
    var currentRecord = context.currentRecord;
    currentRecord.setValue({
        fieldId: 'location',
        value: 'Udaipur'
     })
   }
    return {
        pageInit: pageInit,
    };
});