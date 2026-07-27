/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(["N/currentRecord", "N/search"], (currentRecord, search) => {
  function pageInit(context) {}

  function searchBills() {
    try {
      var rec = currentRecord.get();

      // getting filters from suitelet
      //var location = rec.getValue({ fieldId: "custpage_filter_location" });
      var trantype = rec.getValue({ fieldId: "custpage_filter_vendorpayment" });
      var date = rec.getText({ fieldId: "custpage_filter_date" });
      

      // creating dynamic filters array for search
      var filters = [
        ["mainline", "is", "T"],
        "AND",
        ["approvalstatus", "anyof", "1"],
      ];

      // if (location) {
      //   filters.push("AND");
      //   filters.push(["location", "anyof", location]);
      // }

      if (date) {
        filters.push("AND");
        filters.push(["trandate", "on", date]);
      }

      // for bill
      if(trantype === "vendorbill") {
        filters.push("AND");
        filters.push(["type", "anyof", "VendBill"])
      }

      // for vendor payment
      if(trantype === "vendorpayment") {
        filters.push("AND");
        filters.push(["type", "anyof", "VendPymt"])
      }

      // for expense report
      if(trantype === "expensereport") {
        filters.push("AND")
        filters.push(["type", "anyof", "ExpRept"])
      }

      console.log("location: ", location);
      console.log("date: ", date);
      console.log("transaction type: ", trantype);

      // creating search
      var tranSearch = search.create({
        type: search.Type.TRANSACTION,
        filters: filters,
        columns: [
          "internalid",
          "transactionnumber",
          "type",
          "tranid",
          "entity",
          "amount",
          "location",
        ],
      });

      // clearing existing line or rows on suitelet
      var existingLineCount = rec.getLineCount({
        sublistId: "custpage_bill_list",
      });
      for (var i = existingLineCount - 1; i >= 0; i--) {
        rec.removeLine({ sublistId: "custpage_bill_list", line: i });
      }

      var line = 0;
      tranSearch.run().each(function (res) {
        // tranid value setting
        console.log("Details: ", res);
        console.log("transaction name: ", res.getText("type"));

        rec.selectNewLine({ sublistId: "custpage_bill_list" });

        rec.setCurrentSublistValue({
          sublistId: "custpage_bill_list",
          fieldId: "custpage_billid",
          value: res.getValue("internalid"),
        });

        rec.setCurrentSublistValue({
            sublistId: "custpage_bill_list",
            fieldId: "custpage_billnumber",
            value: res.getValue("transactionnumber")
          })

        rec.setCurrentSublistValue({
          sublistId: "custpage_bill_list",
          fieldId: "custpage_amount",
          value: res.getValue("amount"),
        });

        rec.setCurrentSublistValue({
          sublistId: "custpage_bill_list",
          fieldId: "custpage_docnumber",
          value: res.getValue("tranid"),
        });

        rec.setCurrentSublistValue({
          sublistId: "custpage_bill_list",
          fieldId: "custpage_vendor",
          value: res.getText("entity"),
        });

        rec.setCurrentSublistValue({
          sublistId: "custpage_bill_list",
          fieldId: "custpage_location",
          value: res.getText("location"),
        });

        rec.setCurrentSublistValue({
          sublistId: "custpage_bill_list",
          fieldId: "custpage_type",
          value: res.getText("type"),
        });

        rec.commitLine({ sublistId: "custpage_bill_list" });
        line++;
        return true;
      });
    } catch (err) {
      console.log(err);
    }
  }

  return {
    pageInit: pageInit,
    searchBills: searchBills,
  };
});