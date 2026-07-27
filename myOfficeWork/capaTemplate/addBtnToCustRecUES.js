/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

// this user event creates a button on a custom record called "Quality Assurance Test"
// when we click this button a suitelet will called and print our advanced html pdf
// name of template "Custom Quality Assurance Test PDF/HTML Template CAPA"

define(["N/ui/serverWidget", "N/log", "N/url", "N/search", "N/file"],
  function (serverWidget, log, url, search, file) {

  function beforeLoad(context) {
    try {
      if (context.type !== context.UserEventType.VIEW) {
        return;
      }
      
      const currentRecord = context.newRecord;
      const recordId = currentRecord.id;
      const recordType = currentRecord.type;
      var form = context.form;

      var imagesUrls = [];

      // searching image in custom record, for particular record by record id
      var imgSearch = search.create({
        type: "customrecord_qualityassurancetest",
        filters: [
          ["internalid", "anyof", recordId]
        ],
        columns: [
          search.createColumn({
            name: "url",
            join: "file",
            label: "URL",
          }),
          search.createColumn({
            name: "internalid",
            join: "file",
            label: "File ID",
          }),
          search.createColumn({
            name: "filetype",
            join: "file",
            label: "File Type"
          })
        ],
      });

      imgSearch.run().each(function (res) {
        log.debug("search results", res);

        var fileId = res.getValue({ name: "internalid", join: "file" });

        if (fileId) {
          // Load the file object to retrieve its exact BFO-compatible URL
          var fileObj = file.load({ id: fileId });
          // fileObj.url returns something like "/core/media/media.nl?id=12345&c=ACCT&h=abc..."
          imagesUrls.push(fileObj.url);
        }

        var fileUrl = res.getValue({ name: "url", join: "file" });
        log.debug("file url", fileUrl);

        var fileType = res.getValue({ name: "filetype", join: "file" });
        log.debug("file type", fileType);
        return true;
      });

      // getting current record details
      log.debug("record id: ", recordId);
      log.debug("record type: ", recordType);
      log.debug("images urls", imagesUrls);

      // creating url for suitelet and appending parameters rec id and rec type
      const suiteletUrl = url.resolveScript({
        scriptId: "customscript_capa_report_sut",
        deploymentId: "customdeploy2",
        params: {
          id: recordId,
          type: recordType,
          images: JSON.stringify(imagesUrls),
        },
      });

      // adding to button to custom record
      form.addButton({
        id: "custpage_print",
        label: "CAPA Report",
        functionName: `window.open('${suiteletUrl}', '_blank')`,
      });
    } catch (err) {
      log.debug("error in before load", err);
    }
  }
  return {
    beforeLoad: beforeLoad,
  };
});