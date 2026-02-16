/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/file', 'N/log', 'N/url'],
function (search, record, file, log, url) {

    // ======================== GET INPUT DATA ========================
    function getInputData() {
      log.debug('getInputData', 'Function triggered');

        try {
            var filters = [
                ['formulanumeric: {custrecord_xxbilldtlparentid.custrecord_xxbilldtlamount}-{custrecord_xxbilldtlparentid.custrecord_xxbilldtlreceivedamt}', 'notequalto', '0'],
                'AND',
                ['formulanumeric: {custrecord_xxbilldtlparentid.custrecord_xxbilldtlamount}', 'greaterthan', '0'],
                'AND',
                ['custrecord_xxbilldtlparentid.custrecord_xxbilldtlvendor', 'anyof', '54644'],
            ];

            var columns = [
                search.createColumn({ name: 'custrecord_xxadvicedate' }),
                search.createColumn({ name: 'created' }),
                search.createColumn({ name: 'custrecord_xxbilldtlvendor', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlpono', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlvendorbill', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlbillno', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlamount', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'custrecord_xxbilldtlreceivedamt', join: 'custrecord_xxbilldtlparentid' }),
                search.createColumn({ name: 'formulanumeric', formula: '{custrecord_xxbilldtlparentid.custrecord_xxbilldtlamount}-{custrecord_xxbilldtlparentid.custrecord_xxbilldtlreceivedamt}' }),
                search.createColumn({ name: 'name', sort: search.Sort.ASC })
            ];

            return search.create({
                type: 'customrecordbilladvicemaster',
                filters: filters,
                columns: columns
            });
        
        } catch (e) {
            log.error('Error in getInputData', e);
        }
    }

    // ======================== MAP STAGE ========================
    function map(context) {
      log.debug('map called', context.value);

        try {
            var result = JSON.parse(context.value);
            var adviceNo = result.values.name;
            var adviceDate = result.values.custrecord_xxadvicedate;
            var vendor = result.values["custrecord_xxbilldtlvendor.custrecord_xxbilldtlparentid"];
            var po = result.values["custrecord_xxbilldtlpono.custrecord_xxbilldtlparentid"];
            var vb = result.values["custrecord_xxbilldtlvendorbill.custrecord_xxbilldtlparentid"];
            var bp = result.values["custrecord_xxbilldtlbillno.custrecord_xxbilldtlparentid"];

            var data = {
                adviceNo: adviceNo || '',
                adviceDate: adviceDate || '',
                vendor: vendor || '',
                purchaseorder: po || '',
                vendorbill: vb || '',
                billpayment: bp || '',
                poUrl: '',
                vbUrl: '',
                bpUrl: '',
                vbPdf: ''
            };
            log.debug('data ',data );
            // Resolve current domain dynamically
            var domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });

            // ========== PURCHASE ORDER URL ==========
            if (data.purchaseorder) {
                var poInfo = getInternalIDofRecord(record.Type.PURCHASE_ORDER, data.purchaseorder);
                if (poInfo && poInfo.internalId) {
                    data.poUrl = 'https://' + domain +
                                '/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&formnumber=177&trantype=purchord&id=' 
                                 + poInfo.internalId + 
                                 '&label=Purchase+Order&printtype=transaction';
                }
            }

            // ========== BILL PAYMENT URL ==========
           if (data.billpayment) {
            log.debug('Payment internal id ',data.billpayment.value);
            var bpInfo = data.billpayment.value; //getInternalIDofRecord(record.Type.VENDOR_PAYMENT, data.billpayment);
            log.debug('bpInfo 1',bpInfo); 
            if (bpInfo ) {
                log.debug('in condition ',bpInfo);
             //   data.bpUrl = 'https://' + domain +                        '/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&formnumber=174&id='    + bpInfo +     '&label=Bill+Payment&printtype=paymentvoucher&trantype=vendpymt';
              data.bpUrl = 'https://'+ domain +'/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&printtype=transaction&trantype=VendBill&id='+bpInfo;
            }
            log.debug('data.bpUrl ', data.bpUrl ) ;
          }      
            // ========== VENDOR BILL URL & PDF ==========
          /* if (data.vendorbill) {
            var vbInfo = getInternalIDofRecord(record.Type.VENDOR_BILL, data.vendorbill);
            if (vbInfo && vbInfo.internalId) {
                //  URL for Vendor Bill record view
                data.vbUrl = 'https://' + domain +
                    '/app/accounting/transactions/vendbill.nl?id=' + vbInfo.internalId + '&whence=';
            }

            // Check PDF in folder 13918
            var vbFileName = (vbInfo ? vbInfo.tranId : data.vendorbill) + '.pdf';
            var vbPdfUrl = pdfFileSearch(vbFileName, 13918);
            data.vbPdf = vbPdfUrl || '';
        }*/

            // Output combined record info
            context.write({
                key: data.adviceNo,
                value: JSON.stringify(data)
            });

        } catch (e) {
            log.error('Error in map stage', e);
        }
    }

    // ======================== SUMMARIZE STAGE ========================
    function summarize(summary) {
      log.debug('summarize', 'Execution finished');

        try {
            var allData = [];

            summary.output.iterator().each(function (key, value) {
                allData.push(JSON.parse(value));
                return true;
            });
        // log.debug('Summary Count', allResults.length);

            if (allData.length > 0) {
                var fileObj = file.create({
                    name: 'BillAdviceData_' + new Date().getTime() + '.json',
                    fileType: file.Type.JSON,
                    contents: JSON.stringify(allData),
                    folder: 13920
                });

                var fileId = fileObj.save();
                log.audit('JSON File Created Successfully', 'File ID: ' + fileId);
            } else {
                log.audit('No Data Generated', 'Search returned 0 results');
            }

        } catch (e) {
            log.error('Error in summarize', e);
        }
    }

    // ======================== HELPER: PDF FILE SEARCH ========================
    function pdfFileSearch(vfilename, folderId) {
        try {
            if (!vfilename) return null;

            var filters = [['name', 'is', vfilename]];
            if (folderId) filters.push('AND', ['folder', 'anyof', folderId]);

             var filters = [
            ['folder', 'anyof', folderId],
            'AND',
            ['filetype', 'anyof', 'PDF'],
            'AND',
            ['name', 'is', vfilename]
        ];

        // Define search columns
        var columns = [
            search.createColumn({ name: 'name', sort: search.Sort.ASC }),
            search.createColumn({ name: 'folder' }),
            search.createColumn({ name: 'url' }),
            search.createColumn({ name: 'filetype' })
         ];
           var fileSearch = search.create({
            type: 'file',
            filters: filters,
            columns: columns
            });

            var results = fileSearch.run().getRange({ start: 0, end: 1 });
            if (!results || results.length === 0) {
                log.debug('PDF not found for', vfilename);
                return null;
            }

            var fileUrl = results[0].getValue('url');
            var domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
           var fullUrl = 'https://' + domain + fileUrl;

        log.debug('PDF found', fullUrl);
        return fullUrl;

        } catch (e) {
            log.error('Error in pdfFileSearch', e);
            return null;
        }
    }

    // ======================== HELPER: GET INTERNAL ID FROM TRANID ========================
    function getRecordInternalIdByTranId(recordType, tranId) {
        try {
            var searchObj = search.create({
                type: recordType,
                filters: [['tranid', 'is', tranId]],
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

    // ======================== HELPER: GET RECORD INTERNAL ID & TRANID ========================
    function getInternalIDofRecord(recordType, tranId) {
        try {
          if (typeof tranId === 'object' && tranId !== null) {
            tranId = tranId.value || tranId.text || '';
        }
           tranId = (tranId + '').replace(/Bill\s*#/, '').trim();
            var internalId = getRecordInternalIdByTranId(recordType, tranId);
            if (!internalId) return null;

            var rec = record.load({ type: recordType, id: internalId });

            var fileNameValue = '';
            if (recordType === record.Type.PURCHASE_ORDER) {
                fileNameValue = rec.getValue('tranid');
            } else if (recordType === record.Type.VENDOR_BILL) {
                fileNameValue = rec.getValue('transactionnumber');
            } else {
                fileNameValue = rec.getValue('tranid') || tranId;
            }

            return { internalId: internalId, tranId: fileNameValue };

        } catch (e) {
            log.error('getInternalIDofRecord error', e);
            return null;
        }
    }

    // ======================== EXPORT ========================
    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});
