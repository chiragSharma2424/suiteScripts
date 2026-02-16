/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/log'], function (record, log) {

    function beforeLoad(context) {
        var rec = context.newRecord;
        var tranDate = rec.getValue({
            fieldId: 'trandate'
        });

        // converting to date object
        var transactionDate = new Date(tranDate);
        var today = new Date();
        transactionDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);


        if (transactionDate > today) {
            log.debug("Transaction date is in FUTURE", transactionDate);
        }
        else if (transactionDate < today) {
            log.debug("Transaction date is in PAST", transactionDate);
        } 
        else {
            log.debug("Transaction date is TODAY");
        }
    }

    return {
        beforeLoad: beforeLoad
    };

});