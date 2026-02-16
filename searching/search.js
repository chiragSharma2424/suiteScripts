/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(['N/search', 'N/log'], function(search, log) {
    try{
       var searchh = search.create({
        type: search.Type.INVOICE,
        filters: [
            search.createFilter({
                name: 'status'
            })
        ]
        })
    } catch(error) {
        log.debug("error", error);
    }
})