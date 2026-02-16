/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(["N/search", "N/log"], function (search, log) {
  function execute(context) {
    const purchaseorderSearchObj = search.create({
      type: "transaction",
      filters: [
        ["type", "anyof", "PurchOrd"],
        "AND",
        ["internalid", "anyof", "948"],
      ],
      columns: [
        search.createColumn({ name: "amount", label: "Amount" }),
        search.createColumn({ name: "entity", label: "Name" }),
        search.createColumn({ name: "trandate", label: "Date" }),
        search.createColumn({ name: "location", label: "Location" }),
      ],
    });
    const searchResultCount = purchaseorderSearchObj.runPaged().count;
    log.debug("purchaseorderSearchObj result count", searchResultCount);
    purchaseorderSearchObj.run().each(function (result) {
        log.debug('result', result);
        return true;
    });

    /*
purchaseorderSearchObj.id="customsearch1769165494354";
purchaseorderSearchObj.title="test saved search (copy)";
const newSearchId = purchaseorderSearchObj.save();
*/
  }

  return { execute: execute }
});