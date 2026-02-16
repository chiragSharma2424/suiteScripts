/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(['N/log', 'N/record'], function (log, record) {

    /**
     * Handles GET request
     * @param { Object } requestParams
     */
    function get(requestParams) {
        log.debug("GET request trigeered ", JSON.stringify(requestParams));
        
        var customerRec = record.load({
            type: record.Type.CUSTOMER,
            id: requestParams.customerid,
            isDynamic: true
        });

        var response = {
            id: customerRec.id,
            entityid: customerRec.getValue('entityid'),
            companyname: customerRec.getValue('companyname'),
            email: customerRec.getValue('email'),
            phone: customerRec.getValue('phone'),
            subsidiary: customerRec.getText('subsidiary')
        };

        return response
    }

    /**
     * Handles POST request
     * @param { Object } requestBody
     */
    function post(requestBody) {
       log.debug("POST trigeered ", JSON.stringify(requestBody));

       var objRecord = record.create({
        type: requestBody.recordType
       });

       objRecord.setValue({
        fieldId: 'companyname',
        value: requestBody.name
       });

       objRecord.setValue({
        fieldId: 'subsidiary',
        value: requestBody.subsidiary
       })

       var id = objRecord.save({
        ignoreMandatoryFields: true
       });
       return JSON.stringify({
        id: id,
        message: "Created successfully"
       })
    }

    /**
     * Handles PUT request
     * @param { Object } requestBody
     */
    function put(requestBody) {
       return {
         "msg": "Successfull PUT Request"
       }
    }

    /**
     * Handles DELETE request
     * @param { Object } requestParams
     */
    function del(requestParams) {
        return {
            "msg": "Successfull DELETE Request"
        }
    }

    return {
        get: get,
        post: post,
        put: put,
        delete: del
    };
});