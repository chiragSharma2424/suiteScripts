/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/runtime", "N/log", "N/search", "N/record", "N/format"], function (runtime, log, search, record, format) {

    // Get input data
    function getInputData() {
        try {

            log.debug("gid: ", "start");

            var serialNo = runtime.getCurrentScript().getParameter({
                name: "custscript_serialno"
            });

            log.audit("Serial received from Suitelet", serialNo);

            if (!serialNo) return [];

            // search for lotId
            var lotId;
            var lotSearch = search.create({
                type: 'inventorynumber',
                filters: [['inventorynumber', 'is', serialNo]],
                columns: ['internalid']
            });

            lotSearch.run().each(function (r) {
                lotId = r.getValue('internalid');
                return false;
            });

            if (!lotId) {
                log.audit("No lot found for serial", serialNo);
                return [];
            }


            // Delete old custom records for serial number,
            // saves us from duplicate entry
            var deleteSearch = search.create({
                type: 'customrecord_serial_transactions',
                columns: ['internalid']
            });

            deleteSearch.run().each(function (r) {
                record.delete({
                    type: 'customrecord_serial_transactions',
                    id: r.getValue('internalid')
                });
                return true;
            });

            log.audit("Old records deleted", serialNo);

            return [{
                lotId: lotId,
                serialNo: serialNo
            }];
        } catch (error) {
            log.debug('getInputData error', error)
        }
    }


    // MAP
    function map(context) {
        try {
            log.debug("Map: ", "start")

            var data = JSON.parse(context.value);
            var lotId = data.lotId;
            var serialNo = data.serialNo;

            var allTransactions = [];

            // logging lotId
            log.debug("lotId: ", lotId);


            // Transaction search -> Finding ("Item Receipt", "Item Fulfillment", "Return Authorization", "Invoice", "Inventory Transfer")
            var transactionSearch = search.create({
                type: 'transaction',
                filters: [
                    ['inventorydetail.inventorynumber', 'anyof', lotId],
                    'AND',
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['type', 'anyof',
                        'ItemRcpt',
                        'RtnAuth',
                        'ItemShip',
                        'CustInvc',
                        'InvAdjst',
                        'InvTrnfr',
                    ]
                ],
                columns: [
                    'internalid',
                    'tranid',
                    'trandate',
                    'location',
                    'transferlocation',
                    'entity',
                    'createdfrom',
                    'item',
                    'type',
                    search.createColumn({
                        name: 'type',
                        join: 'item'
                    }),
                    search.createColumn({
                        name: 'inventorynumber',
                        join: 'inventoryDetail'
                    })
                ]
            });

            transactionSearch.run().each(function (r) {

                var tranType = r.getValue('type');

                var typeTextMap = {
                    ItemRcpt: "Item Receipt",
                    RtnAuth: "Sales Return",
                    ItemShip: "Item Fulfillment",
                    CustInvc: "Invoice",
                    InvAdjst: "Inventory Adjustment",
                    InvTrnfr: "Inventory Transfer"
                };

                var obj = {
                    type: typeTextMap[tranType] || tranType,
                    internalId: r.id,
                    tranId: r.getValue('tranid'),
                    date: r.getValue('trandate'),
                    location: r.getText('location'),
                    fromLocation: r.getText('location'),
                    toLocation: r.getText('transferlocation'),
                    entity: r.getText('entity'),
                    createdFrom: r.getText('createdfrom'),
                    item: r.getText('item'),
                    itemType: r.getValue({
                        name: 'type',
                        join: 'item'
                    }),
                    serialNumber: r.getValue({
                        name: 'inventorynumber',
                        join: 'inventoryDetail'
                    })
                };

                allTransactions.push(obj);
              log.debug("")

                context.write({
                    key: serialNo,
                    value: JSON.stringify(obj)
                });

                return true;
            });

            // Logging the array
            log.audit("All Transactions Found", JSON.stringify(allTransactions));
        } catch (error) {
            log.debug('Map error: ', error)
        }
    }

    function reduce(context) {
        try {
            var serialNo = context.key;

            context.values.forEach((value) => {
                var tranType = JSON.parse(value)

                var rec = record.create({
                    type: "customrecord_serial_transactions",
                    isDynamic: false
                });

                rec.setValue({
                    fieldId: "name",
                    value: serialNo + "   " + tranType.type
                })

                rec.setValue({
                    fieldId: "custrecord_std_serial_no",
                    value: serialNo
                });


                rec.setValue({
                    fieldId: "custrecord_std_tran_type",
                    value: tranType.type
                });

                rec.setValue({
                    fieldId: "custrecord_std_tran_internalid",
                    value: tranType.tranId
                });

                rec.setValue({
                    fieldId: "custrecord_std_item_type",
                    value: tranType.itemType
                });


                rec.setValue({
                    fieldId: "custrecord_std_location",
                    value: tranType.location
                });


                rec.setValue({
                    fieldId: "custrecord_std_all_tran",
                    value: tranType
                });

                rec.setValue({
                    fieldId: "custrecord_std_tran_date",
                    value: tranType.date
                });
                var recId = rec.save();
                log.audit("Custom record created", recId);
            });
        } catch (error) {
            log.debug("Reduce error: ", error);
        }
    }

    // Summary function
    function summarize(summary) {

        summary.mapSummary.errors.iterator().each(function (key, error) {
            log.error("Map Error for key: " + key, error);
            return true;
        });

        log.debug('Summary JSON', JSON.stringify(summary));
        log.audit("Map/Reduce Completed");
    }

    return {
        getInputData: getInputData,
        reduce: reduce,
        map: map,
        summarize: summarize
    };

});

// serial number RO9IOIT, LPB2BKVMU18017