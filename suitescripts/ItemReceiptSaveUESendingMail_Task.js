/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['N/log','N/record', 'N/email', 'N/search','N/runtime'], function(log,record, email, search,runtime) {
   
  function isPartReceivedForTheFirstTime(id,partId,locationCode) {
        // Check if the part has any previous item receipt records
        var itemReceiptSearch = search.create({
            type: 'itemreceipt',
            filters:[
										['internalid', 'noneof', id] ,
										'AND',
										['mainline', 'is', 'F'],
										'AND',
										['cogs', 'is', 'F'],
										'AND',
										['taxline', 'is', 'F'],
										'AND',
										['item','is',partId],
                                        'AND',
                                        ['location.custrecord_locationcode','anyof',locationCode],
                                        'AND',
                                        ['vendtype', 'noneof', '7']
				    ]
        });

        var results = itemReceiptSearch.run().getRange({
            start: 0,
            end: 1
        });
        var searchRecordCount = itemReceiptSearch.runPaged().count; 
        log.debug('New Part Received ',results.length + ' Count ' +searchRecordCount); 
      
        return results.length == '0';
    }
    function isPartReceivedFromNewSupplier(id,partId, supplierId,locationCode) {
        var itemReceiptSearch = search.create({
            type: 'itemreceipt',
            filters: [
										['internalid', 'noneof', id] ,
										'AND',
										['mainline', 'is', 'F'],
										'AND',
										['cogs', 'is', 'F'],
										'AND',
										['taxline', 'is', 'F'],
										'AND',
										['item','is',partId],
										'AND',
										['entity','anyof',supplierId],
                                        'AND',
                                        ['location.custrecord_locationcode','anyof',locationCode],
                                        'AND',
                                        ['vendtype', 'noneof', '7']
				    ]
        });

        var results = itemReceiptSearch.run().getRange({
            start: 0,
            end: 1
        });
         var searchRecordCount = itemReceiptSearch.runPaged().count; 
         log.debug('Part Received from New Supplier ',results.length + ' Count ' +searchRecordCount); 
         
        return results.length == '0';
    }
    function isPartReceivedAfterOneYear(id,partId,locationCode) {
        // Check if the part has been received in the last year
        var currentDate = new Date();
        var  oneYearAgo = new Date();
             oneYearAgo.setDate(oneYearAgo.getDate() - 365);
           var day = ('0' + oneYearAgo.getDate()).slice(-2);
           var month = ('0' + (oneYearAgo.getMonth() + 1)).slice(-2); // Months are zero-based
           var year = oneYearAgo.getFullYear();

           var formattedDate = day + '/' + month + '/' + year;

      
       log.debug("current date :",currentDate+"  "+oneYearAgo+" formattedDate "+formattedDate);
      
        var itemReceiptSearch = search.create({
            type: 'itemreceipt',
            filters:[
										['internalid', 'noneof', id] ,
										'AND',
										['mainline', 'is', 'F'],
										'AND',
										['cogs', 'is', 'F'],
										'AND',
										['taxline', 'is', 'F'],
										'AND',
										['item','is',partId],
                                        'AND',
										['trandate','AFTER',formattedDate],
                                        'AND',
                                        ['location.custrecord_locationcode','anyof',locationCode],
                                        'AND',
                                        ['vendtype', 'noneof', '7']
				    ]
        });

        var results = itemReceiptSearch.run().getRange({
            start: 0,
            end: 1
        });
        var searchRecordCount = itemReceiptSearch.runPaged().count; 
        log.debug('Part Received After 1 Year ',results.length + ' Count ' +searchRecordCount); 
        return results.length == '0';
    }
    function sendEmail(currentUser,subject, body) {
        var senderId = currentUser; // The internal ID of the employee or contact sending the email
        var recipientEmail =['rahul.sharma@lipi.in', 'bherulal.menaria@lipi.in','qa.udaipur@lipi.in'];
        /*var bccEmail = ['nitesh.shrimali@lipi.in', 'rakesh.phulwari@lipi.in'];*/

        email.send({
            author: senderId,
            recipients: recipientEmail,
            /*bcc : bccEmail,*/
            subject: subject,
            body: body
        });
    }
   function getInputData(context) {
       try{
            var scriptObj = runtime.getCurrentScript();
            var iId = scriptObj.getParameter({name:'custscriptinternalid'});
            var loc = scriptObj.getParameter({name:'custscriptlocation'});
            
            log.debug("first",iId);
             
          var itemSearch = search.create({
							type: 'itemreceipt',
							filters:[
										['internalid', 'is', iId],
                                        'AND',
                                        ['mainline', 'is', 'T']
									],
							columns: [
										'internalid',
										'tranid'	,
                                        'trandate',
                                        'entity',
                                        'location'
									 ]
                        });
         
                      
                   log.debug('itemSearch ',itemSearch);
         return itemSearch;
               /*    var results     = itemSearch.run().getRange({
                              start: 0,
                              end: 1000 // Adjust the range based on your needs
                       });
                  log.debug('Count ',results.length);
                  return results;*/
    
       }catch (error) {
            log.debug("error (input)", error);
       }
    }
   
	
    function map(context) {
      try{
          log.debug('in MAP','in');
          var currentUser = runtime.getCurrentUser().id
          log.debug('currentUser',currentUser);
          log.debug('context.value ',context.value) ;
      
            var searchResult = JSON.parse(context.value);
            var itemReceiptId = searchResult.id;
            var vendor  = searchResult.values.entity["text"];
            var vendorId  = searchResult.values.entity["value"];
            var location  = searchResult.values.location["text"];
            var tranid    = searchResult.values["tranid"];  
            var trandate    = searchResult.values["trandate"]; 
            var locationCode  =  [32,359,356,355,340,366,332,339,367,337,334,338,335,333,336,178];
         //    var entityId  =               searchResult.getText('entity');
            log.debug('itemReceiptId - ',itemReceiptId);
            log.debug('vendor - ',vendor);
            log.debug('tranId - ',tranid);
            log.debug('trandate - ',trandate);
        
            var newRecord = record.load({
                type: 'itemreceipt',
                id: itemReceiptId,
                isDynamic: true
            });
		    var itemCount = newRecord.getLineCount({sublistId: 'item'});
			log.debug('Item Count ',itemCount);
             for (var i=0;i<itemCount;i++){
								 var itemID = newRecord.getSublistValue({
									sublistId: 'item',
									fieldId: 'item',
									line: i
								 });
								 var itemname = newRecord.getSublistValue({
									sublistId: 'item',
									fieldId: 'itemname',
									line: i
								 });

                                 
								     
									 log.debug({
									 title:'Item Details',
									 details: 'Current Item ID: '+ itemID + 'Item Name- '+itemname
								 });
								var partId = itemID; 
								var supplierId = vendorId;                                 
								
									if (isPartReceivedForTheFirstTime(itemReceiptId,partId,locationCode)) {
                                        var emailBody = '<html><body>';
									    emailBody += '<p>Dear Sir,</br>A new part is received for the first time. Kindly find the below details- </br>GRN <b>'+tranid+'</b></br>Item <b>'+itemname+ '</b></br>Vendor <b>'+vendor+'</b></p></br>Thanks,</br>NetSuite Team';
									    emailBody += '</body></html>';
										sendEmail(currentUser,'New Part Received', emailBody);
										log.debug('New Part Received ','Mail Sent'); 
                                     
									}
									else if (isPartReceivedFromNewSupplier(itemReceiptId,partId, supplierId,locationCode)) {
                                        var emailBody = '<html><body>';
									    emailBody += '<p>Dear Sir,</br>Part is received from a new supplier. Kindly find the below details- </br>GRN <b>'+tranid+'</b></br>Item <b>'+itemname+ '</b></br>Vendor <b>'+vendor+'</b></p></br>Thanks,</br>NetSuite Team';
									    emailBody += '</body></html>';
										sendEmail(currentUser,'Part Received from New Supplier', emailBody);
										log.debug('Part Received from New Supplier ','Mail Sent'); 
                                     
                                      
									}
								    else if (isPartReceivedAfterOneYear(itemReceiptId,partId,locationCode)) {
                                        var emailBody = '<html><body>';
									    emailBody += '<p>Dear Sir,</br>Part is received from a supplier after 1 year. Kindly find the below details- </br>GRN <b>'+tranid+'</b></br>Item <b>'+itemname+ '</b></br>Vendor <b>'+vendor+'</b></p></br>Thanks,</br>NetSuite Team';
									    emailBody += '</body></html>';
										sendEmail('Part Received After 1 Year', emailBody);
                                        log.debug('Part Received After 1 Year','Mail Sent'); 
                                      
									}
								
						 } // end for loop
      }
      catch (e) {
                    // Handle the exception
                    log.error({
                        title: 'Map Error',
                        details: 'An error occurred during the search: ' + e.message
                    });
            }	

    }

    function summarize(summary) {
        // Log summary information after all mapping is complete
        log.debug({
            title: 'Map/Reduce Summary',
            details: 'Email sending process completed'
        });
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };

});