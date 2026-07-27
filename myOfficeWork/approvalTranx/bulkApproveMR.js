/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(["N/search", "N/log", "N/record", "N/runtime", "N/email"],
    function (search, log, record, runtime, email) {

        function getInputData() {
            try {
                log.debug("gid", "start");

                // getting whole search, payload from suitelet 
                var rawPalyload = runtime.getCurrentScript().getParameter({
                    // parameter's id, created in suite let
                    name: "custscript_vendor_bill_id",
                });

                log.debug("raw payload received from suitelet", rawPalyload);

                if (!rawPalyload) {
                    return [];
                }

                return JSON.parse(rawPalyload);

            } catch (err) {
                log.error("error in gid", err);
            }
        }

        function map(context) {
            try {
                log.debug("map fn", "start");

                var data = JSON.parse(context.value);
                log.debug("payload in map fn: ", data)

                // extracting values, data one by one
                var id = data.id;
                var recordType = data.recordType;
                var transactionnumber = data.transactionnumber;
                var tranid = data.tranid;
                var vendor = data.vendor;
                var amount = data.amount;
                var location = data.location;

                log.debug("extracted data: ", {
                    id: id,
                    recordType: recordType,
                    transactionnumber: transactionnumber,
                    tranid: tranid,
                    vendor: vendor,
                    amount: amount,
                    location: location
                })


                // approving bills, vendor payments for specific record type
                record.submitFields({ 
                    type: recordType,
                    id: id,
                    values: {
                        approvalstatus: 2
                    }
                })

                log.debug("successfully approved for: ",{
                    recordType: recordType,
                    id: id
                });


                // writing output to the summary function
                // status is hard coded
                context.write({
                    key: id,
                    value: JSON.stringify({
                        transactionnumber: data.transactionnumber || "",
                        tranid: data.tranid || "",
                        location: data.location || "",
                        amount: data.amount || "0.00",
                        vendor: data.vendor || "",
                        status: "Approved"
                    })
                });

            } catch (err) {
                context.write({
                    key: id,
                    value: JSON.stringify({
                        transactionnumber: data.transactionnumber || "",
                        tranid: data.tranid || "",
                        location: data.location || "",
                        amount: data.amount || "0.00",
                        vendor: data.vendor || "",
                        status: "Failed"
                    })
                })
                log.debug("error in map", err);
            }
        }



        function summarize(summary) {

            try {

                log.debug("Map reduce script completed: ", summary.usage);

                var currentUser = runtime.getCurrentUser();

                var html =
                    "<html><body>" +
                    "<p>Hello " + currentUser.name + ",</p>" +
                    "<p>The following Vendor Bills have been processed.</p>" +
                    "<br/>" +

                    // success table
                    "<b>Approved Bills</b>" +
                    "<table border='1' cellpadding='5' cellspacing='0'>" +
                    "<tr>" +
                    "<th>Transaction Number</th>" +
                    "<th>Tran ID</th>" +
                    "<th>Vendor</th>" +
                    "<th>Location</th>" +
                    "<th>Amount</th>" +
                    "<th>Status</th>"
                    "</tr>";

               

                // success output
                summary.output.iterator().each(function (key, value) {
                    var row = JSON.parse(value);

                    html += "<tr>" +
                        "<td>" + row.transactionnumber + "</td>" +
                        "<td>" + row.tranid + "</td>" +
                        "<td>" + row.vendor + "</td>" +
                        "<td>" + row.location + "</td>" +
                        "<td>" + row.amount + "</td>" +
                        "<td>" + row.status + "</td>"
                        "</tr>";
                    return true;
                }); 

                html += "<br/><br/>This is a system generated email from NetSuite.";
                html += "</body></html>";

                    email.send({
                        author: currentUser.id,
                        recipients: currentUser.email,
                        subject: "Vendor Bill Summary",
                        body: html
                    });

                    log.debug("approval mail sent to user: ", currentUser.email);
                

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


// Meaning	Internal ID
// Pending Approval	1
// Approved	2
/// Rejected 3