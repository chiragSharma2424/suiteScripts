/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/render', 'N/email', 'N/runtime', 'N/log', 'N/format'], function (search, render, email, runtime, log, format) {
    function getInputData() {
        try {    
            var vendorSearch = search.create({
                type: search.Type.VENDOR,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['email', 'isnotempty', ''],
                    // 'AND',
                    // ['internalid', 'is', '54530'],
                    "AND",
                    ["category", "anyof", "6"]
                ],
                columns: [
                    search.createColumn({ name: 'entityid' }),
                    search.createColumn({ name: 'custentity_in_vend_legal_name' }),
                    search.createColumn({ name: 'email' }),
                    search.createColumn({ name: 'Currency' }),
                    search.createColumn({ name: "address" })
                ]
            });
    
            return vendorSearch;
            
        } catch (error) {
            log.debug('error', error)
        }
    }

    function reduce(context) {
        try {
            var vendorInternalId = context.key;
            var result = JSON.parse(context.values[0]);

            var vendorId = result.values.entityid;
            var vendorName = result.values.custentity_in_vend_legal_name;
            var vendorEmail = result.values.email;
            var closingBalance = 0;
            var currency = result.values.Currency.text;
            var address = result.values.address;

            var date = runtime.getCurrentScript().getParameter({
                name: 'custscript_selected_date'
            });

            // var dateObj = format.parse({
            //     value: selectedDate,
            //     type: format.Type.DATE
            // });

            // log.debug('date', date);

            address = address.replaceAll("&", "&amp;");
            vendorName = vendorName.replaceAll("&", "&amp;");

            var closingBalSearch = search.create({
                type: "customrecord_xxflx_lipi_vendor_ledger",
                filters:
                    [
                        ["custrecord_xxflx_vendor_name1", "startswith", vendorId],
                        "AND",
                        ["custrecord_xxflx_closing_debit_amount", "isnotempty", ""]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_xxflx_closing_debit_amount", label: "Closing Amount" })
                    ]
            });

            var res = closingBalSearch.run();
            var rangeres = res.getRange({ start: 0, end: 1 });

            if (rangeres.length) {
                // log.debug('rangeres', rangeres);
                closingBalance = rangeres[0].getValue({ name: 'custrecord_xxflx_closing_debit_amount' });
                // log.debug('closing bal', closingBalance);

                if (closingBalance == '.00') {
                    closingBalance = '0.00'
                }

                var renderer = render.create();
                renderer.templateContent = `
                    <pdf>
                        <body font-size="11">
                            <img src="https://8132412-sb1.app.netsuite.com/core/media/media.nl?id=2158&amp;c=8132412_SB1&amp;h=4OrrkOpAXhVSeZZ45JEcQplSZ7upeyPI-XrxOREV7UbklmsV" align="right" />
                            <p align="center">LIPI DATA SYSTEMS LTD.</p>
                            <p>${vendorId}</p>
                            <p>${vendorName}</p>
                            <p style="width:200px; word-wrap:break-word;">${address}</p>
                            <br />
                            <p>Sub: Confirmation of balance as on ${date}</p>
                            <br />
                            <p>As per our books , balance in your account as on ${date} is ${currency} ${closingBalance} We request
                                you to confirm the above balance by duly signing this is letter.</p>

                            <p>If balance mentioned above does not match with your books, please mention the Balance as per your books and
                                enclose the statement of account for the period ended ${date} for reconciliation.</p>

                            <p>If we do not receive above confirmation letter within 15 days, we will assume the above balance is correct.
                            </p>

                            <p>No dues apart from the amount confirmed.</p>

                            <p>Request your earliest response on the above.</p>

                            <p>For Lipi Data Systems Ltd.</p>


                            <p>This is computer generated document no signature required.</p>
                            <hr style="width:100%;" />
                            <p># We confirm that the above balance is correct and matches with our books of account and also confirming
                                there is no other payment claimable from M/s.Lipi Data systems Ltd, in the form of overriding commission,
                                Back End, Turnover Discount, Cash Discount, Freebies or claim in any form as on ${date}</p>

                            <p># Your balance do not agree with our books (attach your statement and discrepancy list)</p>

                            <p>:- Balance as per our books as on ${date} is ${currency} ${closingBalance}</p>

                            <p>For ${vendorName}</p>

                            <p>Signature with seal</p>

                            <p>Date : ${date}</p>
                        </body>
                    </pdf>
                `;

                var pdfFile = renderer.renderAsPdf();
                pdfFile.name = `Closing_Balance_${vendorId}.pdf`;

                email.send({
                    author: 494100, //runtime.getCurrentUser().id,
                    recipients: vendorEmail,
                    subject: 'Vendor Closing Balance Statement',
                    body: 'Please find attached your closing balance statement.',
                    attachments: [pdfFile],
                    relatedRecords: {
                        entityId: vendorInternalId
                    }
                });

                // log.debug('success', vendorEmail);

            }

        } catch (e) {
            log.error('Error', e);
        }
    }

    return {
        getInputData: getInputData,
        reduce: reduce
    };
});
