/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/task', 'N/search', 'N/runtime', 'N/redirect', 'N/error', 'N/file', 'N/encode','N/log'],
function(ui, task, search, runtime, redirect, error, file, encode, log) {

    /**
     * Main request handler
     * @param { Object } context
     */

    const onRequest = (context) => {
        try {
            var request = context.request;
            var response = context.response;
            
            // Handle Excel download
            if (request.parameters.action === 'download') {
                handleExcelDownload(request, response);
                return;
            }
            
            // Create form
            var form = ui.createForm({
                title: 'Order vs Dispatch Analysis',
            });
            
            // Add parent customer field with "All" option
            var customerField = form.addField({
                id: 'custpage_customer',
                type: ui.FieldType.SELECT,
                label: 'Parent Customer'
            });
            customerField.isMandatory = true;
            
            // Add "All Customers" option
            customerField.addSelectOption({
                value: 'all',
                text: '-- All Customers --'
            });
            
            // Populate customer dropdown with unique parent customers
            populateCustomerDropdown(customerField);
            
            // Add from date field
            var fromDateField = form.addField({
                id: 'custpage_fromdate',
                type: ui.FieldType.DATE,
                label: 'From Date'
            });
            fromDateField.isMandatory = true;
            
            // Add to date field
            var toDateField = form.addField({
                id: 'custpage_todate',
                type: ui.FieldType.DATE,
                label: 'To Date'
            });
            toDateField.isMandatory = true;
            
            // Check for task status if taskid is present
            var taskId = request.parameters.taskid;
            var customerId = request.parameters.customerid;
            
            if (taskId && customerId) {
                // Populate form fields with original values
                customerField.defaultValue = customerId;
                if (request.parameters.fromdate) {
                    fromDateField.defaultValue = request.parameters.fromdate;
                }
                if (request.parameters.todate) {
                    toDateField.defaultValue = request.parameters.todate;
                }
                
                handleTaskStatus(form, taskId, customerId);
            }
            
            // Add submit button
            form.addSubmitButton({
                label: 'Generate Report'
            });
            
            // Handle POST request (form submission)
            if (request.method === 'POST') {
                handleFormSubmit(request, response);
                return;
            }
            
            // Render the form
            response.writePage(form);
            
        } catch (e) {
            log.error('onRequest Error', e.message);
            throw e;
        }
    }
    
    /**
     * Populate customer dropdown with unique parent customers from dispatch records
     * @param { Object } customerField - Customer field object
     */
    function populateCustomerDropdown(customerField) {
        try {
            var customerSearch = search.create({
                type: 'customrecord_lpsalesorderdispatchdetail',
                filters: [
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({
                        name: 'custrecord_salesorddispparentcust',
                        summary: search.Summary.GROUP,
                        sort: search.Sort.ASC
                    })
                ]
            });
            
            customerSearch.run().each(function(result) {
                var customerId = result.getValue({
                    name: 'custrecord_salesorddispparentcust',
                    summary: search.Summary.GROUP
                });
                
                var customerName = result.getText({
                    name: 'custrecord_salesorddispparentcust',
                    summary: search.Summary.GROUP
                });
                
                if (customerId) {
                    customerField.addSelectOption({
                        value: customerId,
                        text: customerName || 'Customer ' + customerId
                    });
                }
                
                return true;
            });
            
        } catch (e) {
            log.error('populateCustomerDropdown Error', e.message);
        }
    }
    
    /**
     * Handle form submission and trigger Map/Reduce script
     * @param { Object } request
     * @param { Object } response
     */
    function handleFormSubmit(request, response) {
        try {
            var customerId = request.parameters.custpage_customer;
            var fromDate = request.parameters.custpage_fromdate;
            var toDate = request.parameters.custpage_todate;
            
            // Validate required fields
            if (!customerId) {
                throw error.create({
                    name: 'MISSING_CUSTOMER',
                    message: 'Parent Customer is required'
                });
            }
            
            if (!fromDate || !toDate) {
                throw error.create({
                    name: 'MISSING_DATES',
                    message: 'From Date and To Date are required'
                });
            }
            
            log.audit('Form Submission', {
                customer: customerId,
                fromDate: fromDate,
                toDate: toDate
            });
            
            // Create and submit Map/Reduce task
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_salesorderdispatchdetailmap',
                deploymentId: 'customdeploy1',
                params: {
                    custscript_parent_customer: customerId,
                    custscript_salesorddispfromdate: fromDate,
                    custscript_salesorddisptodate: toDate
                }
            });
            
            var taskId = mrTask.submit();
            
            log.audit('Map/Reduce Task Submitted', {
                taskId: taskId,
                customerId: customerId
            });
            
            // Redirect to same Suitelet with task ID and parameters
            redirect.toSuitelet({
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                parameters: {
                    taskid: taskId,
                    customerid: customerId,
                    fromdate: fromDate,
                    todate: toDate
                }
            });
            
        } catch (e) {
            log.error('handleFormSubmit Error', e.message);
            throw e;
        }
    }
    
    /**
     * Check Map/Reduce task status and display results
     * @param { Object } form - Form object
     * @param { string } taskId - Task ID
     * @param { string } customerId - Parent Customer ID
     */
    function handleTaskStatus(form, taskId, customerId) {
        try {
            var taskStatus = task.checkStatus({
                taskId: taskId
            });
            
            log.debug('Task Status', {
                taskId: taskId,
                status: taskStatus.status,
                stage: taskStatus.stage
            });
            
            var statusField = form.addField({
                id: 'custpage_status',
                type: ui.FieldType.INLINEHTML,
                label: 'Status',
            });
            
            var statusHtml = '';
            
            switch (taskStatus.status) {
                case task.TaskStatus.COMPLETE:
                    statusHtml = '<div style="padding:10px;background:#d4edda;border:1px solid #c3e6cb;color:#155724;border-radius:4px;">' +
                                '<strong>✓ Processing Complete</strong><br/>' +
                                'Your report is ready below.' +
                                '</div>';
                    addResultSublist(form, customerId);
                    break;
                    
                case task.TaskStatus.FAILED:
                    statusHtml = '<div style="padding:10px;background:#f8d7da;border:1px solid #f5c6cb;color:#721c24;border-radius:4px;">' +
                                '<strong>✗ Processing Failed</strong><br/>' +
                                'Please check the script logs or try again.' +
                                '</div>';
                    break;

                case task.TaskStatus.PENDING:
                case task.TaskStatus.PROCESSING:
                    var percentage = taskStatus.stage ? 
                        getStagePercentage(taskStatus.stage) : 0;
                    statusHtml = '<div style="padding:10px;background:#d1ecf1;border:1px solid #bee5eb;color:#0c5460;border-radius:4px;">' +
                                '<strong>⟳ Processing...</strong><br/>' +
                                'Stage: ' + taskStatus.stage + '<br/>' +
                                'Status: ' + taskStatus.status + '<br/>' +
                                '<div style="margin-top:8px;background:#fff;height:20px;border-radius:10px;overflow:hidden;">' +
                                '<div style="width:' + percentage + '%;height:100%;background:#17a2b8;transition:width 0.3s;"></div>' +
                                '</div>' +
                                '</div>' +
                                '<script>setTimeout(function(){location.reload();}, 5000);</script>';
                    break;
                    
                default:
                    statusHtml = '<div style="padding:10px;background:#fff3cd;border:1px solid #ffeaa7;color:#856404;border-radius:4px;">' +
                                '<strong>Status: ' + taskStatus.status + '</strong><br/>' +
                                'Stage: ' + taskStatus.stage +
                                '</div>' +
                                '<script>setTimeout(function(){location.reload();}, 5000);</script>';
            }
            
            statusField.defaultValue = statusHtml;
            
        } catch (e) {
            log.error('handleTaskStatus Error', e.message);
        }
    }
    
    /**
     * Get approximate completion percentage based on stage
     * @param { string } stage
     * @returns { number }
     */
    function getStagePercentage(stage) {
        var stageMap = {
            'GET_INPUT': 10,
            'MAP': 40,
            'SHUFFLE': 60,
            'REDUCE': 80,
            'SUMMARIZE': 95
        };
        return stageMap[stage] || 0;
    }
    
    /**
     * Add results sublist to form
     * @param { Object } form - Form object
     * @param { string } customerId - Parent Customer ID or "all"
     */
    function addResultSublist(form, customerId) {
        try {
            log.audit('addResultSublist Start', 'Loading results for customer: ' + customerId); 
            
            // First, let's check if ANY results exists 
            var debugSearch = search.create({
                type: 'customrecord_salesorderdispatchdtlres',
                filters: [],
                columns: [
                    'internalid',
                    'custrecordsalesorddispresparentcustomer',
                    search.createColumn({
                        name: 'created',
                        sort: search.Sort.DESC
                    })
                ]
            });
            
            var totalRecords = debugSearch.runPaged().count;
            log.audit('Debug - Total Result Records', totalRecords);
            
            var sublist = form.addSublist({
                id: 'custpage_result',
                type: ui.SublistType.LIST,
                label: 'Item Quantity vs Billing Report'
            });
            
            // Add sublist fields - UPDATED to include PO fields
            sublist.addField({
                id: 'custpage_customer',
                type: ui.FieldType.TEXT,
                label: 'Customer Name'
            });
            
            sublist.addField({
                id: 'custpage_item',
                type: ui.FieldType.TEXT,
                label: 'Item Name'
            });
            
            sublist.addField({
                id: 'custpage_po_number',
                type: ui.FieldType.TEXT,
                label: 'PO Number'
            });
            
            sublist.addField({
                id: 'custpage_po_date',
                type: ui.FieldType.DATE,
                label: 'PO Date'
            });
            
            sublist.addField({
                id: 'custpage_entered',
                type: ui.FieldType.FLOAT,
                label: 'Entered Qty'
            });
            
            sublist.addField({
                id: 'custpage_billed',
                type: ui.FieldType.FLOAT,
                label: 'Billed Qty'
            });
            
            sublist.addField({
                id: 'custpage_pending',
                type: ui.FieldType.FLOAT,
                label: 'Pending Qty'
            });
            
            sublist.addField({
                id: 'custpage_percent',
                type: ui.FieldType.PERCENT,
                label: 'Billed %'
            });
            
            // Create search for results with proper filters
            var filters = [];
            
            if (customerId && customerId !== 'all') {
                filters.push(['custrecordsalesorddispresparentcustomer', 'anyof', customerId]);
                log.audit('Filtering by customer', customerId);
            } else {
                log.audit('Loading all customers', 'No filter applied');
            }
            
            var resultSearch = search.create({
                type: 'customrecord_salesorderdispatchdtlres',
                filters: filters,
                columns: [
                    search.createColumn({
                        name: 'custrecordsalesorddispresparentcustomer',
                        sort: search.Sort.ASC
                    }),
                    search.createColumn({
                        name: 'custrecordsalesorddispresitemname',
                        sort: search.Sort.ASC
                    }),
                    'custrecord_salesorddispresbilledqty',
                    'custrecord_salesorddispresenteredqty',
                    'custrecord_salesorddisprespendqty',
                    'custrecord_salesorddisprespodate',
                    'custrecord_salesorddispresponum',
                    'internalid'
                ]
            });
            
            var searchResultCount = resultSearch.runPaged().count;
            log.audit('Filtered Search Result Count', searchResultCount);
            
            var lineNum = 0;
            var totalEntered = 0;
            var totalBilled = 0;
            var totalPending = 0;
            
            resultSearch.run().each(function(result) {
                try {
                    var customerName = result.getText('custrecordsalesorddispresparentcustomer') || 
                                      result.getValue('custrecordsalesorddispresparentcustomer') || 
                                      'Unknown';
                    var itemName = result.getText('custrecordsalesorddispresitemname') || 
                                  result.getValue('custrecordsalesorddispresitemname') || 
                                  'Unknown';
                    var poNumber = result.getValue('custrecord_salesorddispresponum');
                    poNumber = (poNumber !== null && poNumber !== undefined && poNumber !== '') ? poNumber : 'N/A';
                    
                    var poDate = result.getValue('custrecord_salesorddisprespodate');
                    poDate = (poDate !== null && poDate !== undefined && poDate !== '') ? poDate : '';
                    
                    log.debug('Processing Line ' + lineNum, {
                        customer: customerName,
                        item: itemName,
                        poNumber: poNumber,
                        poDate: poDate,
                        recordId: result.getValue('internalid')
                    });
                    
                    var enteredQty = parseFloat(
                        result.getValue('custrecord_salesorddispresenteredqty')
                    ) || 0;
                    var billedQty = parseFloat(
                        result.getValue('custrecord_salesorddispresbilledqty')
                    ) || 0;
                    var pendingQty = parseFloat(
                        result.getValue('custrecord_salesorddisprespendqty')
                    ) || 0;
                    var billedPercent = enteredQty > 0 ? 
                        (billedQty / enteredQty) * 100 : 0;
                    
                    sublist.setSublistValue({
                        id: 'custpage_customer',
                        line: lineNum,
                        value: customerName || ''
                    });
                    
                    sublist.setSublistValue({
                        id: 'custpage_item',
                        line: lineNum,
                        value: itemName || ''
                    });
                    
                    sublist.setSublistValue({
                        id: 'custpage_po_number',
                        line: lineNum,
                        value: poNumber
                    });
                    
                    sublist.setSublistValue({
                        id: 'custpage_po_date',
                        line: lineNum,
                        value: poDate || ''
                    });
                    
                    sublist.setSublistValue({
                        id: 'custpage_entered',
                        line: lineNum,
                        value: enteredQty.toFixed(2)
                    });
                    
                    sublist.setSublistValue({
                        id: 'custpage_billed',
                        line: lineNum,
                        value: billedQty.toFixed(2)
                    });
                    
                    sublist.setSublistValue({
                        id: 'custpage_pending',
                        line: lineNum,
                        value: pendingQty.toFixed(2)
                    });
                    
                    sublist.setSublistValue({
                        id: 'custpage_percent',
                        line: lineNum,
                        value: (billedPercent).toFixed(2)
                    });
                    
                    totalEntered = totalEntered + enteredQty;
                    totalBilled = totalBilled + billedQty; 
                    totalPending = totalPending + pendingQty;
                    
                    lineNum++;
                } catch (lineError) {
                    log.error('Error Processing Line', {
                        line: lineNum,
                        error: lineError.message,
                        stack: lineError.stack
                    });
                }
                
                return true;
            });
            
            log.audit('Results Loaded', {
                recordCount: lineNum,
                totalEntered: totalEntered,
                totalBilled: totalBilled,
                totalPending: totalPending
            });
            
            // Add summary and download button
            if (lineNum > 0) {
                // Add download button field
                form.addButton({
                    id: 'custpage_download',
                    label: 'Download Excel',
                    functionName: 'downloadExcel("' + customerId + '")'
                });
                
                // Add hidden field to store customer ID for download
                var hiddenCustomerId = form.addField({
                    id: 'custpage_hidden_customerid',
                    type: ui.FieldType.TEXT,
                    label: 'Customer ID'
                });
                hiddenCustomerId.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });
                hiddenCustomerId.defaultValue = customerId;
                
                var summaryField = form.addField({
                    id: 'custpage_summary',
                    type: ui.FieldType.INLINEHTML,
                    label: 'Summary'
                });
                
                var script = runtime.getCurrentScript();
                
                // Add client script for download
                var clientScript = '<script>' +
                    'function downloadExcel(custId) {' +
                    '  var scriptId = "' + script.id + '";' +
                    '  var deployId = "' + script.deploymentId + '";' +
                    '  var downloadUrl = "/app/site/hosting/scriptlet.nl?script=" + scriptId + "&deploy=" + deployId + "&action=download&customerid=" + encodeURIComponent(custId);' +
                    '  window.open(downloadUrl, "_blank");' +
                    '}' +
                    '</script>';
                
                var summaryHtml = clientScript +
                                 '<div style="padding:15px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;margin-top:10px;">' +
                                 '<h3 style="margin-top:0;">Summary</h3>' +
                                 '<table style="width:100%;">' +
                                 '<tr><td><strong>Total Items:</strong></td><td>' + lineNum + '</td></tr>' +
                                 '<tr><td><strong>Total Entered Qty:</strong></td><td>' + totalEntered.toFixed(2) + '</td></tr>' +
                                 '<tr><td><strong>Total Billed Qty:</strong></td><td>' + totalBilled.toFixed(2) + '</td></tr>' +
                                 '<tr><td><strong>Total Pending Qty:</strong></td><td>' + totalPending.toFixed(2) + '</td></tr>' +
                                 '<tr><td><strong>Overall Billed %:</strong></td><td>' + 
                                 (totalEntered > 0 ? ((totalBilled / totalEntered) * 100).toFixed(2) : '0.00') + '%</td></tr>' +
                                 '</table>' +
                                 '</div>';
                
                summaryField.defaultValue = summaryHtml;
            } else {
                var noResultsField = form.addField({
                    id: 'custpage_noresults',
                    type: ui.FieldType.INLINEHTML,
                    label: 'No Results'
                });
                
                noResultsField.defaultValue = '<div style="padding:15px;background:#fff3cd;border:1px solid #ffeaa7;color:#856404;border-radius:4px;margin-top:10px;">' +
                                              '<strong>No results found</strong><br/>' +
                                              'No records were created by the Map/Reduce script. This could mean:<br/>' +
                                              '- No dispatch records found for the selected customer and date range<br/>' +
                                              '- The Map/Reduce script encountered an error<br/>' +
                                              '- Total result records in system: ' + totalRecords + '<br/>' +
                                              'Please check the Map/Reduce script execution logs.' +
                                              '</div>';
            }
            
        } catch (e) {
            log.error('addResultSublist Error', {
                error: e.message,
                stack: e.stack,
                customerId: customerId
            });
            
            var errorField = form.addField({
                id: 'custpage_error',
                type: ui.FieldType.INLINEHTML,
                label: 'Error'
            });
            
            errorField.defaultValue = '<div style="padding:15px;background:#f8d7da;border:1px solid #f5c6cb;color:#721c24;border-radius:4px;margin-top:10px;">' +
                                      '<strong>Error Loading Results</strong><br/>' +
                                      'Error: ' + e.message + '<br/>' +
                                      'Please check the script logs for details.' +
                                      '</div>';
        }
    }
    
    /**
     * Handle Excel download - UPDATED with PO fields
     * @param { Object } request
     * @param { Object } response
     */
    function handleExcelDownload(request, response) {
        try {
            var customerId = request.parameters.customerid;
            
            log.audit('Excel Download', 'Customer ID: ' + customerId);
            
            // Create search for results
            var filters = [];
            if (customerId && customerId !== 'all') {
                filters.push(['custrecordsalesorddispresparentcustomer', 'anyof', customerId]);
            }
            
            var resultSearch = search.create({
                type: 'customrecord_salesorderdispatchdtlres',
                filters: filters,
                columns: [
                    'custrecordsalesorddispresparentcustomer',
                    'custrecordsalesorddispresitemname',
                    'custrecord_salesorddispresbilledqty',
                    'custrecord_salesorddispresenteredqty',
                    'custrecord_salesorddisprespendqty',
                    'custrecord_salesorddisprespodate',
                    'custrecord_salesorddispresponum'
                ]
            });
            
            // Create CSV content with PO fields
            var csvContent = 'Customer Name,Item Name,PO Number,PO Date,Entered Qty,Billed Qty,Pending Qty,Billed %\n';
            
            var totalEntered = 0;
            var totalBilled = 0;
            var totalPending = 0;
            var recordCount = 0;
            
            resultSearch.run().each(function(result) {
                var customerName = result.getText('custrecordsalesorddispresparentcustomer') || 
                                  result.getValue('custrecordsalesorddispresparentcustomer') || '';
                var itemName = result.getText('custrecordsalesorddispresitemname') || 
                              result.getValue('custrecordsalesorddispresitemname') || '';
                var poNumber = result.getValue('custrecord_salesorddispresponum');
                poNumber = (poNumber !== null && poNumber !== undefined && poNumber !== '') ? poNumber : '';
                
                var poDate = result.getValue('custrecord_salesorddisprespodate');
                poDate = (poDate !== null && poDate !== undefined && poDate !== '') ? poDate : '';
                
                var enteredQty = parseFloat(result.getValue('custrecord_salesorddispresenteredqty')) || 0;
                var billedQty = parseFloat(result.getValue('custrecord_salesorddispresbilledqty')) || 0;
                var pendingQty = parseFloat(result.getValue('custrecord_salesorddisprespendqty')) || 0;
                var billedPercent = enteredQty > 0 ? ((billedQty / enteredQty) * 100).toFixed(2) : '0.00';
                
                csvContent += '"' + customerName + '","' + itemName + '","' + poNumber + '","' + poDate + '",' + 
                             enteredQty.toFixed(2) + ',' + billedQty.toFixed(2) + ',' + 
                             pendingQty.toFixed(2) + ',' + billedPercent + '%\n';
                
                totalEntered = totalEntered + enteredQty;
                totalBilled = totalBilled + billedQty;
                totalPending = totalPending + pendingQty;
                recordCount++;
                
                return true;
            });
            
            // Add totals row
            var totalBilledPercent = totalEntered > 0 ? ((totalBilled / totalEntered) * 100).toFixed(2) : '0.00';
            csvContent += '\nTOTAL,,,,' + totalEntered.toFixed(2) + ',' + 
                         totalBilled.toFixed(2) + ',' + totalPending.toFixed(2) + ',' + 
                         totalBilledPercent + '%\n';
            
            log.audit('Excel Download', 'Records exported: ' + recordCount);
            
            // Create and return file
            var fileName = 'Item_Qty_Billing_Report_' + new Date().getTime() + '.csv';
            
            response.setHeader({
                name: 'Content-Type',
                value: 'text/csv'
            });
            
            response.setHeader({
                name: 'Content-Disposition',
                value: 'attachment; filename="' + fileName + '"'
            });
            
            response.write(csvContent);
            
        } catch (e) {
            log.error('handleExcelDownload Error', e.message);
            response.write('Error generating Excel file: ' + e.message);
        }
    }
    
    return {
        onRequest: onRequest
    };
});















let columns = [
                    'custrecordsalesorddispresparentcustomer',
                    'custrecordsalesorddispresitemname',
                    'custrecord_salesorddispresbilledqty',
                    'custrecord_salesorddispresenteredqty',
                    'custrecord_salesorddisprespendqty',
                    'custrecord_salesorddisprespodate',
                    'custrecord_salesorddispresponum'
                ]

var ans = columns.map((col) => {
    return col
})
console.log(ans);