/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/log', 'N/record', 'N/runtime'], function (search, log, record, runtime) {

    function getInputData() {
        try {
            log.debug("gid", "start");

            // const vendorbillSearch = search.create({
            //     type: "vendorbill",
            //     filters:
            //         [
            //             ["type", "anyof", "VendBill"],
            //             "AND",
            //             ["approvalstatus", "anyof", "1"]
            //         ],
            //     columns:
            //         [
            //             search.createColumn({ name: "tranid", label: "Document Number" }),
            //             search.createColumn({ name: "transactionname", label: "Transaction Name" }),
            //             search.createColumn({ name: "internalid", label: "Internal ID" })
            //         ]
            // })
            // return vendorbillSearch;


            
            // receving bill id from suite let as parameter
            // parametr's id
            var billId = runtime.getCurrentScript().getParameter({
                name: 'custscript_vendor_bill_id'
            });
            log.debug("bill id received from suite let: ", billId);

            if(!billId) {
                return []
            }

            return JSON.parse(billId);
        } catch (err) {
            log.debug("error in gid: ", err)
        }
    }

    // map function
    function map(context) {
        try {
            log.debug("map fn", "start")

            var billId = context.value;
            log.debug("bill id in map function:", billId)

            record.submitFields({
                type: record.Type.VENDOR_BILL,
                id: billId,
                values: {
                    approvalstatus: 2 // Approved
                }
            })

            log.debug("approved", billId)
        } catch (err) {
            log.debug("error in map: ", err)
        }
    }

    function summarize(summary) {
        log.debug("Map reduce script completed: ", summary.usage)
    }

    return {
        getInputData,
        map,
        summarize
    }
})
