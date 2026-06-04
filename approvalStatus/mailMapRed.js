/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(
  ["N/search", "N/log", "N/record", "N/runtime", "N/email"],
  function (search, log, record, runtime, email) {

    function getInputData() {
      try {
        log.debug("gid", "start");

        var billId = runtime.getCurrentScript().getParameter({
          name: "custscript_vendor_bill_id",
        });

        log.debug("bill id received from suite let: ", billId);

        if (!billId) {
          return [];
        }

        return JSON.parse(billId);

      } catch (err) {
        log.error("error in gid", err);
      }
    }

    function map(context) {
      try {

        log.debug("map fn", "start");

        var billId = context.value;

        log.debug("bill id in map function:", billId);

        // Approve Vendor Bill
        record.submitFields({
          type: record.Type.VENDOR_BILL,
          id: billId,
          values: {
            approvalstatus: 2
          }
        });

        log.debug("approved", billId);

        // Lookup bill details for email
        var lookup = search.lookupFields({
          type: search.Type.VENDOR_BILL,
          id: billId,
          columns: [
            "tranid",
            "entity",
            "location",
            "total"
          ]
        });

        log.debug("lookup data", lookup);

        context.write({
          key: billId,
          value: JSON.stringify({
            billId: billId,
            tranid: lookup.tranid || "",
            vendor:
              lookup.entity &&
              lookup.entity.length
                ? lookup.entity[0].text
                : "",

            location:
              lookup.location &&
              lookup.location.length
                ? lookup.location[0].text
                : "",

            amount: lookup.total || "0.00"
          })
        });

      } catch (err) {
        log.error("error in map", err);
      }
    }

    function summarize(summary) {

      try {

        log.debug(
          "Map reduce script completed: ",
          summary.usage
        );

        var currentUser = runtime.getCurrentUser();

        log.debug("Current User", currentUser);

        var html =
          "<html><body>" +
          "<p>Hello " + currentUser.name + ",</p>" +
          "<p>The following Vendor Bills have been approved successfully.</p>" +
          "<br/>" +
          "<table border='1' cellpadding='5' cellspacing='0'>" +
          "<tr>" +
          "<th>Bill ID</th>" +
          "<th>Tran ID</th>" +
          "<th>Vendor</th>" +
          "<th>Location</th>" +
          "<th>Amount</th>" +
          "</tr>";

        var totalCount = 0;

        summary.output.iterator().each(function (key, value) {

          var row = JSON.parse(value);

          html +=
            "<tr>" +
            "<td>" + row.billId + "</td>" +
            "<td>" + row.tranid + "</td>" +
            "<td>" + row.vendor + "</td>" +
            "<td>" + row.location + "</td>" +
            "<td>" + row.amount + "</td>" +
            "</tr>";

          totalCount++;

          return true;
        });

        html += "</table>";

        html +=
          "<br/><br/>" +
          "<b>Total Bills Approved : " +
          totalCount +
          "</b>";

        html +=
          "<br/><br/>This is a system generated email from NetSuite.";

        html += "</body></html>";

        if (totalCount > 0) {

          email.send({
            author: currentUser.id,
            recipients: currentUser.email,
            subject:
              "Vendor Bill Approval Summary (" +
              totalCount +
              " Bills)",
            body: html
          });

          log.debug(
            "Approval summary email sent",
            currentUser.email
          );
        }

      } catch (err) {
        log.error("error in summarize", err);
      }
    }

    return {
      getInputData,
      map,
      summarize,
    };
  }
);
