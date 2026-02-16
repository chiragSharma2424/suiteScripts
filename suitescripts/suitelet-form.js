/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/search'], (serverWidget, search) => {

    function onRequest(scriptContext) {

      log.debug("onRequest Methods?", scriptContext.request.method)

      if(scriptContext.request.method === "GET") {
         var form = serverWidget.createForm({
            title: 'Basic Form'
        });

        var fieldGroup = form.addFieldGroup({
            id: 'custpage_usergroup',
            label: 'User Information'
        });

        var fname = form.addField({
            id: 'custpage_fnamefield',
            type: serverWidget.FieldType.TEXT,
            label: 'First Name',
            container: 'custpage_usergroup'
        });

      var lname = form.addField({
         id: 'custpage_lnamefield',
         type: serverWidget.FieldType.TEXT,
         label: 'Last Name',
         container: 'custpage_usergroup'
      })
     

      var email = form.addField({
        id: 'custpage_emailfield',
        type: serverWidget.FieldType.EMAIL,
        label: 'Email',
        container: 'custpage_usergroup'
      });
      email.isMandatory = true;

      

      form.addResetButton({
        label: 'Reset Button'
      })
      form.addSubmitButton({
        label: 'Submit Button'
      })

      var sublist = form.addSublist({
        id: 'custpage_sublistid',
        type: serverWidget.SublistType.LIST,
        label: 'Sublist'
      });
      sublist.addMarkAllButtons();

      sublist.addField({
        id: 'custpage_checkbox',
        type: serverWidget.FieldType.CHECKBOX,
        label: 'SELECT'
      });

      sublist.addField({
        id: 'custpage_customer',
        type: serverWidget.FieldType.TEXT,
        label: 'Customer'
      })

       sublist.addField({
        id: 'custpage_internalid',
        type: serverWidget.FieldType.INTEGER,
        label: 'Internal ID'
      })

       sublist.addField({
        id: 'custpage_trannum',
        type: serverWidget.FieldType.INTEGER,
        label: 'Transaction Number'
      })

      var mySearch = search.load({
         id: 'customsearch_salesorder'
      });

      var lineCounter = 0;

      mySearch.run().each(function(result) {
         var entity = result.getText({
            name: 'entity'
         });
         var tranid = result.getValue('tranid');
         var id = result.id

         sublist.setSublistValue({
            id: 'custpage_customer',
            line: lineCounter,
            value: entity
         })


         sublist.setSublistValue({
            id: 'custpage_internalid',
            line: lineCounter,
            value: result.id
         })

         sublist.setSublistValue({
            id: 'custpage_trannum',
            line: lineCounter,
            value: tranid
         });
         
         lineCounter++;
         return true
      })
      
        scriptContext.response.writePage(form);
        } else {
         log.debug("request triggered in else ", scriptContext.request.method)
         var myname = scriptContext.request.parameters.custpage_fnamefield
         log.debug("myname ", myname)
         var serverRequest = scriptContext.request;
         var lineCount = serverRequest.getLineCount({
            group: 'custpage_sublistid'
         });

         for(var i = 0; i < lineCount; i++) {
            var tranInternalId = serverRequest.getSublistValue({
               group: 'custpage_sublistid',
               name: 'custpage_internalid',
               line: i
            });

            log.debug("tranInternalId ", tranInternalId);
         }

         scriptContext.response.write({
            output: `<h1>Data Recevied</h1> </br>
             <h2>Hello World!</h2>  </br>
             <h3>Suite form is running</h3>
            `
         })

         var lineCount = serverRequest.getLineCount({
            group: 'custpage_sublistid'
         })
        }
      }

    return {
        onRequest: onRequest
    };
});