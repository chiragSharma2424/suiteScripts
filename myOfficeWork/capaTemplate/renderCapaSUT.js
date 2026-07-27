/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(["N/render", "N/record", "N/log", "N/file"], function (render, record, log, file) {
  function onRequest(context) {
    try {
      const request = context.request;
      const recordId = request.parameters.id;
      const recordType = request.parameters.type;

      // var imageIds = JSON.parse(request.parameters.images);
      var imagesUrls = JSON.parse(request.parameters.images);
      const cleanUrls = imagesUrls.map(function (u) {
        return u ? u.replace(/&/g, "&amp;") : "";
      });

      log.debug("record id in suitelet: ", recordId);
      log.debug("record type in suite let: ", recordType);
      //log.debug("Images received", imageIds);
      log.debug("Images url", imagesUrls)
      //log.debug("zero index image:", imageIds[0]);

      const rec = record.load({
        type: recordType,
        id: recordId,
      });

      const renderer = render.create();
      renderer.setTemplateById(550);

      renderer.addRecord({
        templateName: "record",
        record: rec,
      });

      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: "images",
        data: {
          files: cleanUrls,
        },
      });

      log.debug("Custom datasource added", "OK");

      const pdf = renderer.renderAsPdf();

      context.response.writeFile(pdf, true);
    } catch (err) {
      log.debug("error in suite let: ", err);
    }
  }

  return {
    onRequest: onRequest,
  };
});
