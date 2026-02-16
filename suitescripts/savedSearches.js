/** @NApiVersion 2.1 */
const vendorSearchObj = search.create({
   type: "vendor",
   filters:
   [
      ["city","startswith","udaipur"]
   ],
   columns:
   [
      search.createColumn({name: "entityid", label: "ID"}),
      search.createColumn({name: "altname", label: "Name"}),
      search.createColumn({name: "email", label: "Email"}),
      search.createColumn({name: "phone", label: "Phone"}),
      search.createColumn({name: "fax", label: "Fax"})
   ]
});
const searchResultCount = vendorSearchObj.runPaged().count;
log.debug("vendorSearchObj result count",searchResultCount);
vendorSearchObj.run().each(function(result){
   // .run().each has a limit of 4,000 results
   return true;
});

/*
vendorSearchObj.id="customsearch1769151543906";
vendorSearchObj.title="test search (copy)";
const newSearchId = vendorSearchObj.save();
*/