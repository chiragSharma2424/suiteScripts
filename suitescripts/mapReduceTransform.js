/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/record', 'N/log'], function (search, record, log) {
    var SO_INV_ARRAY = [];

    function getInputData() {
        const salesOrderSearchColInternalId = search.createColumn({ name: 'internalid' });
        const salesOrderSearchColDocumentNumber = search.createColumn({ name: 'tranid' });
        const salesOrderSearchColName = search.createColumn({ name: 'entity' });
        const salesOrderSearch = search.create({
            type: 'salesorder',
            filters: [
                ["type", "anyof", "SalesOrd"],
                'AND',
                ["status", "anyof", "SalesOrd: B"],
                'AND',
                ['trandate', 'within', '26/10/24', '26/10/24'],
                'AND',
                ['mainline', 'is', 'T']
            ],
            columns: [
                salesOrderSearchColInternalId,
                salesOrderSearchColDocumentNumber,
                salesOrderSearchColName
            ],
        });
        log.debug("what we recieve: ", salesOrderSearch);
        return salesOrderSearch;
    }

    function map(context) {
        try {
            log.debug({
                title: "this is context.value",
                details: context.value
            });

            var data = JSON.parse(context.value);
            var docnumber = data.values["tranid"]
            var sonumber_internalid = data.values.internalid["value"];
            log.debug("Document number: ", docnumber);
            log.debug("Internal id of document number ", sonumber_internalid)

            var item_ful = record.transform({
                fromType: 'salesorder',
                fromId: sonumber_internalid,
                toType: 'itemfulfillment'
            });

            var item_ful_submit = item_ful.save({
                enablesourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug("item fullfillment id", item_ful_submit)

            context.write({
                key: sonumber_internalid,
                value: sonumber_internalid
            });

        } catch(e) {
            log.error("Error Found: ", e);
        }
    }

    function reduce(context) {
       try {
        var soId = context.key;

        log.debug({
            title: "this is third pary reduce context.key",
            details: soId
        });

        var invoice_create = record.transform({
            fromType: 'salesorder',
            fromId: soId,
            toType: 'invoide',
            isDynamic: true
        });

        var invoice_create_submit = invoice_create.save()

        SO_INV_ARRAY.push({
            'so internal id': soId,
            'invoice id': invoice_create_submit
        });

        log.debug("Here is array in Reduce part ", SO_INV_ARRAY);
        context.write({
            key: 'Total activity', // so ID
            value: invoice_create_submit
        });

        log.debug({
            title: 'InvoiceIds',
            details: invoice_create_submit
        });

       } catch(e) {
        log.error({
            title: "Error occured in reduce",
            details: e
        });
       }
    }

    function summarize(summary) {
        var totalSalesReport = []
        
        summary.output.iterator().each(function(key, value) {
            var so_internalId = key;
            var invoice_id = value;

            log.debug("sales order", so_internalId);
            log.debug("Converted invoice id", invoice_id);
        })
    }

   return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
   }
});