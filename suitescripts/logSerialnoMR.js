/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/runtime', 'N/log'], function(runtime, log) {
    function getInputData() {
        var serial = runtime.getCurrentScript().getParameter({
            name: ''
        });

        log.debug(`serial no recieved in Map/Reduce ${serial}`);

        return [];
    }

    function map(context) {

    }

    function reduce(context) {

    }

    function summarize() {

    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
})