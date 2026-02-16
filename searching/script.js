/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(['N/search', 'N/log'], function (search, log) {

    function execute(context) {
        var loading = search.load({
            id: 'customsearch_invoicesearch'
        });
        var searchResults = loading.run().getRange({
            start: 0,
            end: 9
        });
        log.debug("Results: ", searchResults);
    }

    return {
        execute: execute
    };

});