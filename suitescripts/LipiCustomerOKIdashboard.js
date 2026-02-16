/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/ui/serverWidget', 'N/log', 'N/file', 'N/search', 'N/task','N/url'], 
function (serverWidget, log, file, search, task ,url) {
    function getRecordInternalIdByTranId(recordType, tranId) {
    try {
        var searchObj = search.create({
            type: recordType,
            filters: [
                ['numbertext', 'haskeywords', tranId],   // better operator for exact match
                'AND',
                ['mainline', 'is', 'T']
            ],
            columns: ['internalid']
        });

        var result = searchObj.run().getRange({ start: 0, end: 1 });
        if (result && result.length > 0) { 
            return result[0].getValue('internalid');
        }
        return null;

    } catch (e) {
        log.error('Error in getRecordInternalIdByTranId', e);
        return null;
    }
}
    function getInfo(selectedVendor,fromDate,toDate)
      {       
            var filters = [
                ['formulanumeric: {custrecord_xxbilldtlparentid.custrecord_xxbilldtlamount}-{custrecord_xxbilldtlparentid.custrecord_xxbilldtlreceivedamt}', 'notequalto', '0'],
                'AND',
                ['formulanumeric: {custrecord_xxbilldtlparentid.custrecord_xxbilldtlamount}', 'greaterthan', '0'],
               /* 'AND',
                ['custrecord_xxbilldtlparentid.custrecord_xxbilldtlvendor', 'anyof', '54644'],  */
            ];
            if (selectedVendor && selectedVendor !== '') {
                   filters.push('AND');
                   filters.push(['custrecord_xxbilldtlparentid.custrecord_xxbilldtlvendor', 'anyof', selectedVendor]);
            }

             // From Date filter
           if (fromDate && fromDate !== '') {
                   filters.push('AND');
                   filters.push(['custrecord_xxadvicedate', 'onorafter', fromDate]);
           }

            // To Date filter
          if (toDate && toDate !== '') {
                  filters.push('AND');
                  filters.push(['custrecord_xxadvicedate', 'onorbefore', toDate]);
          }

            var columns = [
                search.createColumn({ name: 'name', sort: search.Sort.ASC }),
                search.createColumn({ name: 'custrecord_xxadvicedate' }),
                search.createColumn({ name: 'created' }),
                search.createColumn({ name: 'custrecord_xxbilldtlvendor', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlpono', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlvendorbill', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlbillno', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlamount', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlreceivedamt', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlvendorbilpymt', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'formulanumeric', formula: '{custrecord_xxbilldtlparentid.custrecord_xxbilldtlamount}-{custrecord_xxbilldtlparentid.custrecord_xxbilldtlreceivedamt}' })
            ];

            var searchResults = search.create({
                type: 'customrecordbilladvicemaster',
                filters: filters,
                columns: columns
            });
         
            var returnArray = [];
    
    // Process the search results
                 var cols1 = searchResults.columns;
                  var searchResultCount = searchResults.runPaged().count;
                 log.debug("itemFulfillmentSearch result count",searchResultCount);
                 searchResults.run().each(function(result){

                    var advno             = result.getValue(cols1[0]);
                    var advDate           = result.getValue(cols1[1]);
                    var adVendor          = result.getText(cols1[3]);
                    var advPO             = result.getValue(cols1[4]);
                    var advBill           = result.getValue(cols1[5]);                  
                    var advBillinvoice    = result.getText(cols1[6]);
                    var advBillId         = result.getValue(cols1[6]);
                    var advBillAmt        = result.getValue(cols1[7]);
                    var advBillRecAmt     = result.getValue(cols1[8]);
                    var advBillpymt       = result.getValue(cols1[9]);

                    
                    returnArray.push({
                        'advno':  advno,
                        'advDate' : advDate  ,
                        'adVendor'  : adVendor,
                        'advPO':advPO,
                        'advBill':advBill,                      
                        'advBillinvoice':advBillinvoice,
                        'advBillId':advBillId,
                        'advBillAmt' :advBillAmt,
                        'advBillRecAmt':advBillRecAmt,
                        'advBillpymt':advBillpymt
                    })

                    return true;
                 });  
    log.debug("Rate Array", returnArray);
    return returnArray;

  }
    function onRequest(context) {
        try {
            var request = context.request;
            var form = serverWidget.createForm({
                title: 'Lipi OKI Dashboard : Customer'
            });

            // ---------------- Vendor Filter ----------------
             var vendorField = form.addField({
                id: 'custpage_selectfield_vendname',
                type: serverWidget.FieldType.SELECT,
                label: 'Vendor',
                source: 'vendor'
            }).updateLayoutType({
                layoutType: serverWidget.FieldLayoutType.STARTROW
            });

          // ---------------- Date Filters ----------------
           var fromDateField = form.addField({
             id: 'custpage_selectfield_fdate',
             type: serverWidget.FieldType.DATE,
             label: 'From Date'
           }).updateLayoutType({ layoutType: serverWidget.FieldLayoutType.MIDROW });

          var toDateField = form.addField({
             id: 'custpage_selectfield_todate',
             type: serverWidget.FieldType.DATE,
             label: 'To Date'
           }).updateLayoutType({ layoutType: serverWidget.FieldLayoutType.MIDROW });
          
            // Add Submit Button
            form.addSubmitButton({ label: 'Submit' });

            // ---------- Status Field -----------
            var statusField = form.addField({
                id: 'custpage_status',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            });

                  // ---------- Table Sublist -----------
            var sublist = form.addSublist({
                id: 'custpage_sublist',
                label: 'Bill Advice Details',
                type: serverWidget.SublistType.LIST
            });

            sublist.addField({ id: 'advice_no', label: 'Advice No', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'advice_date', label: 'Advice Date', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'vendor', label: 'Vendor', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'purchaseorder', label: 'PO Number', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'vendorbill', label: 'Vendor Bill', type: serverWidget.FieldType.TEXT });            
            sublist.addField({ id: 'billinvoice', label: 'Bill Invoice', type: serverWidget.FieldType.TEXT });

            sublist.addField({ id: 'vendorbillpymt', label: 'Vendor Bill Payment', type: serverWidget.FieldType.TEXT }); 
          
            sublist.addField({ id: 'billpaymentamount', label: 'Bill Amount', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'billpaymentrecdamount', label: 'Bill Received Amount', type: serverWidget.FieldType.TEXT });

            sublist.addField({ id: 'po_pdf', label: 'PO PDF', type: serverWidget.FieldType.URL });
            sublist.addField({ id: 'vb_pdf', label: 'Vendor Bill PDF', type: serverWidget.FieldType.URL });
            sublist.addField({ id: 'bp_pdf', label: 'Bill Payment PDF', type: serverWidget.FieldType.URL });

            sublist.getField({ id: 'po_pdf' }).linkText = 'View PDF';
            sublist.getField({ id: 'vb_pdf' }).linkText = 'View PDF';
            sublist.getField({ id: 'bp_pdf' }).linkText = 'View PDF';
            

                var selectedVendor = request.parameters.custpage_selectfield_vendname || '';
                var fromDate = request.parameters.custpage_selectfield_fdate || '';
                var toDate = request.parameters.custpage_selectfield_todate || '';   
          
         if (request.method === 'POST') {
                var domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
                sublistData = getInfo(selectedVendor, fromDate, toDate);
                sublistData.forEach(function(rowData, index) {
                  
                sublist.setSublistValue({
                        id: 'advice_no',
                        line: index,
                        value: rowData.advno  
                       }); 
                if (rowData.advDate !== null && rowData.advDate !== '' && rowData.advDate !== undefined) {  
                sublist.setSublistValue({
                        id: 'advice_date',
                        line: index,
                        value: rowData.advDate  
                       });   
                }
                if (rowData.adVendor !== null && rowData.adVendor !== '' && rowData.adVendor !== undefined) {  
                sublist.setSublistValue({
                        id: 'vendor',
                        line: index,
                        value: rowData.adVendor  
                       });   
                }  
                if (rowData.advBill !== null && rowData.advBill !== '' && rowData.advBill !== undefined) {  
                sublist.setSublistValue({
                        id: 'vendorbill',
                        line: index,
                        value: rowData.advBill  
                       });  
                var vbpUrl = 'https://'+ domain +'/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&printtype=transaction&trantype=VendBill&id='+rowData.advBillId;  
                
                sublist.setSublistValue({
					     id : 'vb_pdf',
					    line : index,
					    value : vbpUrl 
				       });  
                  
                } 
                if (rowData.advPO !== null && rowData.advPO !== '' && rowData.advPO !== undefined) {  
                sublist.setSublistValue({
                        id: 'purchaseorder',
                        line: index,
                        value: rowData.advPO  
                       });   
                  
                  var pointId = getRecordInternalIdByTranId('purchaseorder',rowData.advPO);                  
                
                  var poUrl = 'https://' + domain +
                                '/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&formnumber=177&trantype=purchord&id=' 
                                 + pointId+ 
                                 '&label=Purchase+Order&printtype=transaction';
                  
                   sublist.setSublistValue({
					     id : 'po_pdf',
					    line : index,
					    value : poUrl 
				       });  
                
                  
                }   
                if (rowData.advBillinvoice !== null && rowData.advBillinvoice !== '' && rowData.advBillinvoice !== undefined) {  
     
                sublist.setSublistValue({
                        id: 'billinvoice',
                        line: index,
                        value: rowData.advBillinvoice  
                       });   
                }     
                if (rowData.advBillAmt !== null && rowData.advBillAmt !== '' && rowData.advBillAmt !== undefined) {  
                sublist.setSublistValue({
                        id: 'billpaymentamount',
                        line: index,
                        value: rowData.advBillAmt  
                       });   
                } 
                if (rowData.advBillRecAmt !== null && rowData.advBillRecAmt !== '' && rowData.advBillRecAmt !== undefined) {  
                sublist.setSublistValue({
                        id: 'billpaymentrecdamount',
                        line: index,
                        value: rowData.advBillRecAmt  
                       });   
                }
                if (rowData.advBillpymt !== null && rowData.advBillpymt !== '' && rowData.advBillpymt !== undefined) {
                   sublist.setSublistValue({
                        id: 'vendorbillpymt',
                        line: index,
                        value: rowData.advBillpymt  
                       });  
                       var pointId = getRecordInternalIdByTranId('vendorpayment',rowData.advBillpymt);                  
                
                  var billpymtUrl = 
                  'https://'+ domain +'/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&formnumber=174&id='+pointId+'&label=Bill+Payment&printtype=paymentvoucher&trantype=vendpymt';
                  
                   sublist.setSublistValue({
					     id : 'bp_pdf',
					    line : index,
					    value : billpymtUrl 
				       });  
                }
                  
                });
               
         }
               
        
            context.response.writePage(form);
     }
     catch (e) {
            log.error('Error in Suitelet', e);
            context.response.write('Error: ' + e.message);
        }
    }



    return { onRequest: onRequest };
});
