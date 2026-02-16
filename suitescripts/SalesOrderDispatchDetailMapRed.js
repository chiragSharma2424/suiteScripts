/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/runtime', 'N/record', 'N/error'],
function(search, runtime, record, error) {
    
    /**
     * Get input data - retrieves sales order dispatch details for parent customer
     * @returns {Search} Search object containing dispatch details
     */
    function getInputData() {
        try {
            log.audit('getInputData', 'Starting script execution');
            
            var script = runtime.getCurrentScript();
            var parentCustomerId = script.getParameter({
                name: 'custscript_parent_customer'
            });
            
            if (!parentCustomerId) {
                throw error.create({
                    name: 'MISSING_PARAMETER',
                    message: 'Parent Customer ID parameter is required'
                });
            }
            
            var fromDate = script.getParameter({name: 'custscript_salesorddispfromdate'});
            var toDate = script.getParameter({name: 'custscript_salesorddisptodate'});
            var poNumber = script.getParameter({name: 'custscript_salesorddisppono'});
            var poDate = script.getParameter({name: 'custscript_salesorddisppodate'});
            
            log.audit('Parameters', {
                parentCustomerId: parentCustomerId,
                fromDate: fromDate,
                toDate: toDate,
                poNumber: poNumber,
                poDate: poDate,
                isAllCustomers: (parentCustomerId === 'all')
            });
            
            // Delete previous results for this parent customer or all customers
            try {
                var deleteFilters = [];
                
                if (parentCustomerId !== 'all') {
                    deleteFilters.push(['custrecordsalesorddispresparentcustomer', 'anyof', parentCustomerId]);
                }
                
                var deleteSearch = search.create({
                    type: 'customrecord_salesorderdispatchdtlres',
                    filters: deleteFilters.length > 0 ? deleteFilters : [],
                    columns: ['internalid']
                });
                
                var deleteCount = 0;
                deleteSearch.run().each(function(result) {
                    try {
                        record.delete({
                            type: 'customrecord_salesorderdispatchdtlres',
                            id: result.getValue('internalid')
                        });
                        deleteCount++;
                    } catch (delErr) {
                        log.error('Delete Individual Record Error', delErr.message);
                    }
                    return true;
                });
                
                log.audit('Cleanup', 'Deleted ' + deleteCount + ' previous result records');
            } catch (deleteError) {
                log.error('Cleanup Error', deleteError.message);
            }
            
            // Build filters for dispatch search
            var dispatchFilters = [
                ['isinactive', 'is', 'F']
            ];
            
            if (parentCustomerId !== 'all') {
                dispatchFilters.push('AND');
                dispatchFilters.push(['custrecord_salesorddispparentcust', 'anyof', parentCustomerId]);
            }
            
            var dispatchSearch = search.create({
                type: 'customrecord_lpsalesorderdispatchdetail',
                filters: dispatchFilters,
                columns: [
                    search.createColumn({
                        name: 'custrecord_salesorddispparentcust',
                        sort: search.Sort.ASC
                    }),
                    search.createColumn({
                        name: 'custrecord_salesorddispitemname'
                    }),
                    search.createColumn({
                        name: 'custrecord_salesorddispqty'
                    }),
                    search.createColumn({
                        name: 'custrecord_salesorddispponumber'
                    }),
                    search.createColumn({
                        name: 'custrecord_salesorddisppodate'
                    }),
                    search.createColumn({
                        name: 'internalid'
                    })
                ]
            });
            
            var resultCount = dispatchSearch.runPaged().count;
            log.audit('Input Data Count', resultCount + ' dispatch records found');
            
            if (resultCount === 0) {
                log.error('No Input Data', 'No dispatch records found for the criteria');
            }
            
            return dispatchSearch;
            
        } catch (e) {
            log.error('getInputData Error', {
                message: e.message,
                stack: e.stack
            });
            throw e;
        }
    }
    
    /**
     * Map stage - processes each dispatch detail record
     * @param {Object} context
     */
    function map(context) {
        try {
            var searchResult = JSON.parse(context.value);
            
            var parentCustId = searchResult.values.custrecord_salesorddispparentcust.value;
            var itemId = searchResult.values.custrecord_salesorddispitemname.value;
            var qty = parseFloat(searchResult.values.custrecord_salesorddispqty) || 0;
            var poNumber = searchResult.values.custrecord_salesorddispponumber || '';
            var poDate = searchResult.values.custrecord_salesorddisppodate || '';
            
            log.debug('Map Stage', {
                recordId: searchResult.id,
                parentCustomer: parentCustId,
                item: itemId,
                qty: qty,
                poNumber: poNumber,
                poDate: poDate
            });
            
            if (!itemId || !parentCustId) {
                log.error('Map Error - Missing Data', {
                    recordId: searchResult.id,
                    hasItem: !!itemId,
                    hasCustomer: !!parentCustId
                });
                return;
            }
            
            // Use combination of parent customer, item, and PO number as key
            var key = parentCustId + '|' + itemId + '|' + poNumber;
            
            context.write({
                key: key,
                value: {
                    parentCustomerId: parentCustId,
                    itemId: itemId,
                    qty: qty,
                    poNumber: poNumber,
                    poDate: poDate,
                    recordId: searchResult.id
                }
            });
            
            log.debug('Map Success', 'Key: ' + key + ', Qty: ' + qty);
            
        } catch (e) {
            log.error('Map Error', {
                error: e.message,
                stack: e.stack,
                context: context.value
            });
        }
    }
    
    /**
     * Reduce stage - aggregates quantities and creates result records
     * @param { Object } context
     */
    function reduce(context) {
        try {
            var keyParts = context.key.split('|');
            var parentCustomerId = keyParts[0];
            var itemId = keyParts[1];
            var poNumber = keyParts[2] || '';
            
            var enteredQty = 0;
            var poDate = '';
            var recordIds = [];
            
            log.debug('Reduce Stage Start', {
                key: context.key,
                parentCustomer: parentCustomerId,
                item: itemId,
                poNumber: poNumber,
                valueCount: context.values.length
            });
            
            // Sum up all quantities for this customer-item-po combination
            context.values.forEach(function(valueStr) {
                var valueObj = JSON.parse(valueStr);
                enteredQty += parseFloat(valueObj.qty) || 0;
                recordIds.push(valueObj.recordId);
                if (!poDate && valueObj.poDate) {
                    poDate = valueObj.poDate;
                }
            });
            
            log.debug('Reduce Aggregation', {
                key: context.key,
                enteredQty: enteredQty,
                poDate: poDate,
                recordCount: recordIds.length
            });
            
            var script = runtime.getCurrentScript();
            var fromDate = script.getParameter({
                name: 'custscript_salesorddispfromdate'
            });
            var toDate = script.getParameter({
                name: 'custscript_salesorddisptodate'
            });
            
            // Get billed quantity from invoices matching PO number
            var billedQty = getBilledQty(itemId, parentCustomerId, fromDate, toDate, poNumber);
            var pendingQty = enteredQty - billedQty;
            
            log.audit('Reduce Quantities', {
                customer: parentCustomerId,
                item: itemId,
                poNumber: poNumber,
                poDate: poDate,
                enteredQty: enteredQty,
                billedQty: billedQty,
                pendingQty: pendingQty
            })
            
            // Create result record with PO fields
            try {
                var itemName = itemId;
                var customerName = parentCustomerId;
                
                if (itemId) {
                    var itemRec = search.lookupFields({
                        type: search.Type.ITEM,
                        id: itemId,
                        columns: ['itemid', 'displayname']
                    });
                    itemName = itemRec.displayname || itemId;
                }

                if (parentCustomerId) {
                    var custRec = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: parentCustomerId,
                        columns: ['entityid', 'companyname']
                    });
                    customerName = custRec.companyname || parentCustomerId;
                }
                
                var resultRecord = record.create({
                    type: 'customrecord_salesorderdispatchdtlres',
                    isDynamic: false
                });
                
                resultRecord.setValue({
                    fieldId: 'custrecordsalesorddispresparentcustomer',
                    value: customerName
                });
                
                resultRecord.setValue({
                    fieldId: 'custrecordsalesorddispresitemname',
                    value: itemName
                });
                
                resultRecord.setValue({
                    fieldId: 'custrecord_salesorddispresenteredqty',
                    value: enteredQty
                });
                
                resultRecord.setValue({
                    fieldId: 'custrecord_salesorddispresbilledqty',
                    value: billedQty
                });
                
                resultRecord.setValue({
                    fieldId: 'custrecord_salesorddisprespendqty',
                    value: pendingQty
                });
                
                resultRecord.setValue({
                    fieldId: 'custrecord_salesorddispresponum',
                    value: poNumber
                });
                
                resultRecord.setValue({
                    fieldId: 'custrecord_salesorddisprespodate',
                    value: poDate
                });
                
                var recordId = resultRecord.save();
                
                log.audit('Result Created Successfully', {
                    resultRecordId: recordId,
                    customer: parentCustomerId,
                    item: itemId,
                    poNumber: poNumber,
                    poDate: poDate,
                    entered: enteredQty,
                    billed: billedQty,
                    pending: pendingQty
                });
                
            } catch (saveErr) {
                log.error('Error Saving Result Record', {
                    error: saveErr.message,
                    stack: saveErr.stack,
                    customer: parentCustomerId,
                    item: itemId,
                    poNumber: poNumber
                });
                throw saveErr;
            }
            
        } catch (e) {
            log.error('Reduce Error', {
                error: e.message,
                stack: e.stack,
                key: context.key
            });
        }
    }
    
    /**
     * Get billed quantity from invoices for specific item, parent customer, and PO number
     * @param {string} itemId - Internal ID of the item
     * @param {string} parentCustomerId - Internal ID of parent customer
     * @param {string} fromDate - Start date for invoice search
     * @param {string} toDate - End date for invoice search
     * @param {string} poNumber - PO number to match
     * @returns {number} Total billed quantity
     */
    function getBilledQty(itemId, parentCustomerId, fromDate, toDate, poNumber) {
        var qty = 0;
        
        try {
            // First, get all child customers of the parent
            var childCustomerIds = getChildCustomers(parentCustomerId);
            
            log.debug('getBilledQty Start', {
                item: itemId,
                parentCustomer: parentCustomerId,
                poNumber: poNumber,
                childCustomerCount: childCustomerIds.length,
                fromDate: fromDate,
                toDate: toDate
            });
            
            if (childCustomerIds.length === 0) {
                log.debug('getBilledQty', 'No child customers found, returning 0');
                return 0;
            }
            
            var filters = [
                ['mainline', 'is', 'F'],
                'AND',
                ['taxline', 'is', 'F'],
                'AND',
                ['cogs', 'is', 'F'],
                'AND',
                ['entity', 'anyof', childCustomerIds],
                'AND',
                ['item', 'anyof', itemId],
                'AND',
                ['otherrefnum', 'equalto', poNumber]
                
            ];
            
            // Add PO number filter if provided
            if (poNumber && poNumber !== '') {
                filters.push('AND');
                filters.push(['otherrefnum', 'is', poNumber]);
            }
            
            // Add date filters if provided
            if (fromDate && toDate) {
                filters.push('AND');
                filters.push(['trandate', 'within', fromDate, toDate]);
            }
            
            var invoiceSearch = search.create({
                type: search.Type.INVOICE,
                filters: filters,
                columns: [
                    search.createColumn({
                        name: 'quantity',
                        summary: search.Summary.SUM
                    })
                ]
            });
            
            invoiceSearch.run().each(function(result) {
                qty = parseFloat(
                    result.getValue({
                        name: 'quantity',
                        summary: search.Summary.SUM
                    })
                ) || 0;
                return false;
            });
            
            log.debug('getBilledQty Result', {
                item: itemId,
                parentCustomer: parentCustomerId,
                poNumber: poNumber,
                billedQty: qty
            });
            
        } catch (e) {
            log.error('getBilledQty Error', {
                error: e.message,
                stack: e.stack,
                itemId: itemId,
                parentCustomerId: parentCustomerId,
                poNumber: poNumber
            });
        }
        
        return qty;
    }
    
    /**
     * Get all child customer IDs for a parent customer
     * @param {string} parentCustomerId - Internal ID of parent customer
     * @returns {Array} Array of child customer internal IDs
     */
    function getChildCustomers(parentCustomerId) {
        var childIds = [];
        
        try {
            var customerSearch = search.create({
                type: search.Type.CUSTOMER,
                filters: [
                    ['parent', 'anyof', parentCustomerId],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'internalid' })
                ]
            });
            
            customerSearch.run().each(function(result) {
                childIds.push(result.getValue({ name: 'internalid' }));
                return true;
            });
            
            log.debug('getChildCustomers', {
                parent: parentCustomerId,
                childCount: childIds.length,
                childIds: childIds.join(', ')
            });
            
        } catch (e) {
            log.error('getChildCustomers Error', {
                error: e.message,
                stack: e.stack,
                parentCustomerId: parentCustomerId
            });
        }
        
        return childIds;
    }
    
    /**
     * Summarize stage - logs execution summary
     * @param {Object} summary
     */
    function summarize(summary) {
        log.audit('=== SCRIPT SUMMARY START ===', '');
        log.audit('Execution Time', summary.seconds + ' seconds');
        log.audit('Usage Consumed', summary.usage + ' units');
        log.audit('Concurrency', summary.concurrency + ' queues');
        log.audit('Yields', summary.yields);
        
        // Log input stage
        log.audit('Input Stage', {
            error: summary.inputSummary.error || 'None',
            count: summary.inputSummary.count
        });
        
        // Log map stage
        log.audit('Map Stage', {
            keys: summary.mapSummary.keys.length,
            errors: summary.mapSummary.errors.iterator().length
        });
        
        // Log map errors
        var mapErrorCount = 0;
        summary.mapSummary.errors.iterator().each(function(key, error) {
            mapErrorCount++;
            log.error('Map Error', 'Key: ' + key + ', Error: ' + error);
            return true;
        });
        
        if (mapErrorCount === 0) {
            log.audit('Map Stage', 'No errors');
        }
        
        // Log reduce stage
        log.audit('Reduce Stage', {
            keys: summary.reduceSummary.keys.length,
            errors: summary.reduceSummary.errors.iterator().length
        });
        
        // Log reduce errors
        var reduceErrorCount = 0;
        summary.reduceSummary.errors.iterator().each(function(key, error) {
            reduceErrorCount++;
            log.error('Reduce Error', 'Key: ' + key + ', Error: ' + error);
            return true;
        });
        
        if (reduceErrorCount === 0) {
            log.audit('Reduce Stage', 'No errors');
        }
        
        log.audit('=== SCRIPT SUMMARY END ===', 'Check custom record "customrecord_salesorderdispatchdtlres" for results');
    }
    
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});