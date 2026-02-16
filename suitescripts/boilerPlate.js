/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define([], function () {

    function beforeLoad(context) {
        // beforeLoad logic
    }

    function beforeSubmit(context) {
        // beforeSubmit logic
    }

    function afterSubmit(context) {
        // afterSubmit logic
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});



// client side script boiler plate code

/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define([], function () {

    function pageInit(context) {
        // page init
    }

    function fieldChanged(context) {
        // field changed
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


// Map/Reduce script boiler plate code

/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define([], function () {

    function getInputData() {
        // return input data
    }

    function map(context) {
        // map logic
    }

    function reduce(context) {
        // reduce logic
    }

    function summarize(summary) {
        // summarize logic
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});


// Restlet boiler plate code

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define([], function () {

    function get(requestParams) {
        // GET logic
    }

    function post(requestBody) {
        // POST logic
    }

    function put(requestBody) {
        // PUT logic
    }

    function deleteRecord(requestParams) {
        // DELETE logic
    }

    return {
        get: get,
        post: post,
        put: put,
        delete: deleteRecord
    };
});


// suite let boiler plate code

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(["N/ui/serverWidget", "N/task", "N/search"], function () {

    function onRequest(context) {
        // handle GET / POST
    }

    return {
        onRequest: onRequest
    };
});




// Saved searches boiler plate code
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(['N/search', 'N/log'], function (search, log) {

    function execute(context) {

        var savedSearch = search.load({
            id: 'customsearch_your_saved_search_id'
        });

        savedSearch.run().each(function (result) {

            // your logic here

            return true;
        });

    }

    return {
        execute: execute
    };

});
