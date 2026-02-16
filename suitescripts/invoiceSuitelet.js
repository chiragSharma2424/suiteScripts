/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search'], function(serverWidget, search) {
    function onRequest(context) {
        if(context.request.method === 'GET') {
            var form = serverWidget.createForm({
                title: "Invoice search by serial number"
            })

            form.addField({
                id: 'custpage_serialno',
                type: serverWidget.FieldType.TEXT,
                label: 'Serial Number'
            }).isMandatory = true

            form.addSubmitButton({
                label: 'Search Invoices'
            })
            context.response.writePage(form);
        }


        // now POST request
        if(context.request.method === 'POST') {
            var serialNo = context.request.parameters.custpage_serialno;

            var form = serverWidget.createForm({
                title: 'Invoice search result'
            });

            form.addField({
                id: 'custpage_serialno_display',
                type: serverWidget.FieldType.TEXT,
                label: 'Serial Number'
            }).defaultValue = serialNo;


            var sublist = form.addSublist({
                id: 'custpage_result',
                type: serverWidget.SublistType.LIST,
                label: 'Invoices'
            });

            sublist.addField({ 
                id: 'inv', 
                type: serverWidget.FieldType.TEXT,
                label: 'Invoice #'
            });
            
            sublist.addField({ id: 'item', type: serverWidget.FieldType.TEXT, label: 'Item' });
            sublist.addField({ id: 'date', type: serverWidget.FieldType.DATE, label: 'Date' });
            sublist.addField({ id: 'loc', type: serverWidget.FieldType.TEXT, label: 'Location' });

            var invoiceSearch = search.create({
                type: search.Type.INVOICE,
                filters: [
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['taxline', 'is', 'F'],
                    'AND',
                    ['custcol_invdetail', 'startswith', serialNo]
                ],
                columns: [
                    'tranid',
                    'item',
                    'trandate',
                    'location'
                ]
            })

            var i = 0;
            invoiceSearch.run().each(function (result) {

                sublist.setSublistValue({
                    id: 'inv',
                    line: i,
                    value: result.getValue('tranid') || ''
                });

                sublist.setSublistValue({
                    id: 'item',
                    line: i,
                    value: result.getText('item') || ''
                });

                sublist.setSublistValue({
                    id: 'date',
                    line: i,
                    value: result.getValue('trandate')
                });

                sublist.setSublistValue({
                    id: 'loc',
                    line: i,
                    value: result.getText('location') || ''
                });

                i++;
                return true;
            });

            form.addButton({
                id: 'custpage_back',
                label: 'Back',
                functionName: 'history.back()'
            });

            context.response.writePage(form);

        }
    }

    return {
        onRequest: onRequest
    }
})