/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/search', 'N/task', 'N/log'],
function (ui, search, task, log) {

    function onRequest(context) {

        try {

            if (context.request.method === 'GET') {

                var form = ui.createForm({
                    title: 'Vendor Bill Approval'
                });

                // =====================================
                // SUBLIST
                // =====================================

                var sublist = form.addSublist({
                    id: 'custpage_bill_list',
                    type: ui.SublistType.LIST,
                    label: 'Pending Approval Vendor Bills'
                });

                sublist.addMarkAllButtons();

                sublist.addField({
                    id: 'custpage_select',
                    type: ui.FieldType.CHECKBOX,
                    label: 'Select'
                });

                sublist.addField({
                    id: 'custpage_billid',
                    type: ui.FieldType.TEXT,
                    label: 'Internal ID'
                });

                sublist.addField({
                    id: 'custpage_billnumber',
                    type: ui.FieldType.TEXT,
                    label: 'Bill Number'
                });

                sublist.addField({
                    id: 'custpage_vendor',
                    type: ui.FieldType.TEXT,
                    label: 'Vendor'
                });

                // =====================================
                // SEARCH PENDING APPROVAL BILLS
                // =====================================

                var billSearch = search.create({
                    type: search.Type.VENDOR_BILL,
                    filters: [
                        ['mainline', 'is', 'T'],
                        'AND',
                        ['approvalstatus', 'anyof', '1']
                    ],
                    columns: [
                        'internalid',
                        'transactionnumber',
                        'entity'
                    ]
                });

                var line = 0;

                billSearch.run().each(function (result) {

                    var billId = result.getValue('internalid');
                    var billNumber = result.getValue('transactionnumber');
                    var vendor = result.getText('entity');

                    sublist.setSublistValue({
                        id: 'custpage_billid',
                        line: line,
                        value: billId.toString()
                    });

                    sublist.setSublistValue({
                        id: 'custpage_billnumber',
                        line: line,
                        value: billNumber
                    });

                    if (vendor) {
                        sublist.setSublistValue({
                            id: 'custpage_vendor',
                            line: line,
                            value: vendor
                        });
                    }

                    line++;

                    return true;
                });

                form.addSubmitButton({
                    label: 'Approve Selected Bills'
                });

                context.response.writePage(form);
            }

            // ==========================================
            // POST
            // ==========================================

            else {

                var lineCount = context.request.getLineCount({
                    group: 'custpage_bill_list'
                });

                var selectedBills = [];

                for (var i = 0; i < lineCount; i++) {

                    var selected = context.request.getSublistValue({
                        group: 'custpage_bill_list',
                        name: 'custpage_select',
                        line: i
                    });

                    if (selected === 'T') {

                        var billId = context.request.getSublistValue({
                            group: 'custpage_bill_list',
                            name: 'custpage_billid',
                            line: i
                        });

                        selectedBills.push(billId);
                    }
                }

                log.debug('Selected Bills', selectedBills);

                if (selectedBills.length === 0) {

                    context.response.write(
                        'Please select at least one Vendor Bill.'
                    );

                    return;
                }

                // =====================================
                // TRIGGER MR
                // =====================================

                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_approval_status_mr',
                    deploymentId: 'customdeploy_approval_status_mr',
                    params: {
                        custscript_vendor_bill_id:
                            JSON.stringify(selectedBills)
                    }
                });

                var taskId = mrTask.submit();

                log.debug('MR Triggered', {
                    taskId: taskId,
                    bills: selectedBills
                });

                context.response.write(
                    selectedBills.length +
                    ' Vendor Bills submitted for approval.<br><br>' +
                    'Task ID : ' + taskId
                );
            }

        } catch (err) {

            log.error({
                title: 'Suitelet Error',
                details: err
            });

            context.response.write(err.message);
        }
    }

    return {
        onRequest: onRequest
    };

});
