/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search'], () => {

    const getInputData = () => {
        // input data yahan se aata hai
        return [];
    };

    const map = (mapContext) => {
       
    };

    const reduce = (reduceContext) => {
        // grouped data yahan process hota hai
    };

    const summarize = (summaryContext) => {
        // final summary / logs / errors
    };

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});
