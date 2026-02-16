/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define([], function () {

    function getInputData() {
        // return data source
    }

    function map(context) {
        // process each input
    }

    function reduce(context) {
        // aggregate / heavy processing
    }

    function summarize(summary) {
        // final logging / cleanup
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
