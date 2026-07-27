/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(["N/ui/serverWidget", "N/search", "N/task", "N/log", "N/redirect", "N/format", "N/ui/message"], 
  function (serverWidget, search, task, log, redirect, format, message) {

  function onRequest(context) {
    // client script path
    const CLIENT_SCRIPT_PATH = "SuiteScripts/searchbills_cs.js";
    try {
      if (context.request.method === "GET") {
        var form = serverWidget.createForm({ title: "Transactions Records Approval" });
        form.clientScriptModulePath = CLIENT_SCRIPT_PATH;

        // success message after submitting the bills
        const params = context.request.parameters;
        if (params.request === "success") {
          form.addPageInitMessage({
            type: message.Type.INFORMATION,
            title: 'Transaction record sended successfully for approval!',
            message: ''
          });
        } else if(params.request === "error") {
          form.addPageInitMessage({
            type: message.Type.ERROR,
            title: 'Submission failed',
            message: 'Error occur while sending record for approval'
          })
        }

        // Filters, location filter
        // var locationField = form.addField({
        //   id: "custpage_filter_location",
        //   type: serverWidget.FieldType.SELECT,
        //   label: "Location",
        //   source: "location",
        // });
        // locationField.isMandatory = true;
        // locationField.defaultValue = "123"; // internal id of location udaipur production

        // date filter
        var dateField = form.addField({
          id: "custpage_filter_date",
          type: serverWidget.FieldType.DATE,
          label: "Date",
        });
        dateField.isMandatory = true; // default date is todays date
        dateField.defaultValue = format.format({
          value: new Date(),
          type: format.Type.DATE,
        });

        // vedro bill, bill payment, expense report
        var TransactionType = form.addField({
          id: "custpage_filter_vendorpayment",
          type: serverWidget.FieldType.SELECT,
          label: "Select Transaction",
        });
        TransactionType.isMandatory = true;

        TransactionType.defaultValue = "Bill";
        TransactionType.addSelectOption({
          value: "vendorbill",
          text: "Bill",
        });

        TransactionType.addSelectOption({
          value: "vendorpayment",
          text: "Bill Payment",
        });

        TransactionType.addSelectOption({
          value: "expensereport",
          text: "Expense Report"
        })

       
        // creating sublist and setting sublist value in client script
        var sublist = form.addSublist({
          id: "custpage_bill_list",
          type: serverWidget.SublistType.INLINEEDITOR,
          label: "Pending Approval Vendor Bills",
        });

        sublist.addField({
          id: "custpage_select",
          type: serverWidget.FieldType.CHECKBOX,
          label: "Select",
        });
        sublist.addField({
          id: "custpage_billid",
          type: serverWidget.FieldType.TEXT,
          label: "Internal ID",
        });
        sublist.addField({
          id: "custpage_billnumber",
          type: serverWidget.FieldType.TEXT,
          label: "Bill/Payment Number",
        });
        sublist.addField({
          id: "custpage_docnumber",
          type: serverWidget.FieldType.TEXT,
          label: "Document Number",
        });
        sublist.addField({
          id: "custpage_vendor",
          type: serverWidget.FieldType.TEXT,
          label: "Vendor",
        });
        sublist.addField({
          id: "custpage_amount",
          type: serverWidget.FieldType.TEXT,
          label: "Amount",
        });
        sublist.addField({
          id: "custpage_location",
          type: serverWidget.FieldType.TEXT,
          label: "Location",
        });
        sublist.addField({
          id: "custpage_type",
          type: serverWidget.FieldType.TEXT,
          label: "Type",
        });

        // approve button send POST request
        form.addSubmitButton({
          label: "Approve",
        });

        // search button will search the records according to filters, function created in client script
        form.addButton({
          id: "custpage_searchbtn",
          label: "Search",
          functionName: "searchBills",
        });

        context.response.writePage(form);
      }

      // POST request
      // if(context.request.method === 'POST') => POST logic, calling map reduce script
      else {
        var lineCount = context.request.getLineCount({
          group: "custpage_bill_list",
        });
        var trantype = context.request.parameters.custpage_filter_vendorpayment; // getting trantype from ui
        var selectedTransactions = [];

        for (var i = 0; i < lineCount; i++) {
          // getting values from sublist, bill ids
          var selected = context.request.getSublistValue({
            group: "custpage_bill_list",
            name: "custpage_select",
            line: i,
          });

          if (selected === "T") {
            selectedTransactions.push({
              id: context.request.getSublistValue({
                group: "custpage_bill_list",
                name: "custpage_billid",
                line: i,
              }),
              recordType: trantype === "vendorpayment" ? "vendorpayment" : trantype === "expensereport" ? "expensereport" : "vendorbill",
              transactionnumber: context.request.getSublistValue({
                group: "custpage_bill_list",
                name: "custpage_billnumber",
                line: i,
              }),
              tranid: context.request.getSublistValue({
                group: "custpage_bill_list",
                name: "custpage_docnumber",
                line: i,
              }),
              vendor: context.request.getSublistValue({
                group: "custpage_bill_list",
                name: "custpage_vendor",
                line: i,
              }),
              amount: context.request.getSublistValue({
                group: "custpage_bill_list",
                name: "custpage_amount",
                line: i,
              }),
              location: context.request.getSublistValue({
                group: "custpage_bill_list",
                name: "custpage_location",
                line: i,
              }),
              type: context.request.getSublistValue({
                group: "custpage_bill_list",
                name: "custpage_type",
                line: i,
              }),
            });
          }
        }

        log.debug("selected transactions", selectedTransactions);

        

        // trigger map reduce [POST logic]
        // creating task
        var mrTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: "customscript_bulk_approve_bills_mr",
          deploymentId: "customdeploy1",
          params: {
            // parameter id
            custscript_vendor_bill_id: JSON.stringify(selectedTransactions),
          },
        });
        var taskId = mrTask.submit();

        log.debug("mr trigger", {
          taskId: taskId,
          bills: selectedTransactions,
        });

        //  redirecting the suitelet
        // script id, deployment id updated 13 july 2026
        redirect.toSuitelet({
          scriptId: "customscript_bulk_approve_bills",
          deploymentId: "customdeploy1",
          parameters: {
            request: "success",
          },
        });
      }
    } catch (err) {
      log.debug("error in suite let: ", err);

      // error message
      redirect.toSuitelet({
        scriptId: "customscript_bulk_approve_bills",
        deploymentId: "customdeploy1",
        parameters: {
          request: "error",
          msg: err.message
        }
      });
    }
  }

  return {
    onRequest: onRequest,
  };
});