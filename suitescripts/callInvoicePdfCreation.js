/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public 
 */
define(['N/render', 'N/record', 'N/log', 'N/file', 'N/https','N/url'], function(render, record, log, file, https, url) {
    function createFile(context) {
        try {
          
			rec_id = context.rec_id ;
            log.debug("rec_id ",rec_id);
           //  for invoice PDF
          // ----------------start ------------------
            var renderer = render.create();
          
            renderer.setTemplateByScriptId({
                scriptId: "CUSTTMPL_107_8132412_119" 
            });

            renderer.addRecord('record', record.load({
                type: record.Type.INVOICE,
                id: rec_id
            }));

            var invoicePDF = renderer.renderAsPdf();

            invoicePDF.folder = 1336;
            invoicePDF.name = rec_id+'_inv.pdf';
            var fileName = invoicePDF.name ;
            //invoicePDF.fileType = file.Type.PDF;
            invoicePDF.isOnline = true; // Set the "Available Without Login" property to true
            invoicePDF.availableWithoutLogin = true;
            var fileId = invoicePDF.save();
            log.debug("Field ID", fileId);
            log.debug(" challanPDF.isOnline", invoicePDF.isOnline);
            log.debug(" availableWithoutLogin", invoicePDF.availableWithoutLogin)
       
           // var fileURL = file.load({id: fileId }).url;
          //  log.debug("fileURL " , fileURL);
            var accountLink = url.resolveDomain({hostType: url.HostType.APPLICATION});
          
            var loadFile = file.load({ id: fileId})
            var initialURL = loadFile.url
            log.debug("initialURL " , initialURL);
          
            var finalURL = accountLink+initialURL
            log.debug("finalURL " , finalURL);
          //  ----------------- end----------------------------
          
          //  for invoice Delivery Challan PDF
          // ----------------start ------------------
            var renderer1 = render.create();
          
            renderer1.setTemplateByScriptId({
                scriptId: "CUSTTMPL_108_8132412_907"
            });

            renderer1.addRecord('record', record.load({
                type: record.Type.INVOICE,
                id: rec_id
            }));

            var challanPDF = renderer1.renderAsPdf();

            challanPDF.folder = 1336;
            challanPDF.name = rec_id+'_challan.pdf';
            var fileName1 = challanPDF.name ;
            //challanPDF.fileType = file.Type.PDF;
            challanPDF.isOnline = true; // Set the "Available Without Login" property to true
            challanPDF.availableWithoutLogin = true;
            var fileId1 = challanPDF.save();
            log.debug("Field ID", fileId1);
            log.debug(" challanPDF.isOnline", challanPDF.isOnline);
            log.debug(" availableWithoutLogin", challanPDF.availableWithoutLogin)
       
           // var fileURL1 = file.load({id: fileId1 }).url;
           // log.debug("fileURL " , fileURL1);
            var accountLink1 = url.resolveDomain({hostType: url.HostType.APPLICATION});
            var loadFile1 = file.load({ id: fileId1})

            var initialURL1 = loadFile1.url
            log.debug("initialURL " , initialURL1);
            var finalURL1 = accountLink1+initialURL1
          
            log.debug("finalURL " , finalURL1);
            
          
          //  -----------------challan end----------------------------
          
            var invRecord = record.load({
                                   type: 'invoice',
                                   id: rec_id
                                   });

            var invoiceDate = invRecord.getValue({ fieldId: 'trandate' });
            log.debug("Invoice Date", invoiceDate);
            var invoiceDateObj = new Date(invoiceDate);
            log.debug("invoiceDateObj", invoiceDateObj);
            // Define 01-Apr-2025 as cutoff
            var cutoffDate = new Date('2025-04-01');
          
            invRecord.setValue({
            fieldId: 'custbody_pdfurl', 
            value: finalURL
            });
          
            invRecord.setValue({
            fieldId: 'custbody_challanpdfurl', 
            value: finalURL1
            });

          
            try {
                invRecord.save();
            }
            catch (e) {
            log.error(e.name, e.message);
            }
        } catch (e) {
            log.error(e.name, e.message);
        }
    }
    function onRequest(context) {
           log.debug(" create file ", "In");
            var rec_id = context.rec_id;
            log.debug("record id ",rec_id);
            if (rec_id) {
                createFile({
                    rec_id: rec_id
                });
            } else {
                log.error({
                    title: 'Invalid parameters',
                    details: 'Please Check invoice id'
                });
            }
        } 
    return {
       onRequest: onRequest
    };
});