/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(['N/currentRecord'], function (currentRecord) {

    /**
     * @param { Object } context
     */
    function pageInit(context) {
        log.debug({
            title: 'Entry Point',
            details: 'pageInit triggered'
        });
        console.log('PageInit triggered')
    }

    /**
     * @param { Object } context
     */
    function fieldChanged(context) {
        log.debug({
            title: 'Entry Point',
            details: 'fieldChanged triggered'
        });
        console.log('field change triggered')
    }

    /**
     * @returns { boolean }
     */
    function saveRecord(context) {
       log.debug({
        title: 'Entry Point',
        details: 'SaveRecord triggered'
       });
       console.log('Save Record triggered');
        return true;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});
