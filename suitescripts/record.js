require(['N/record'], (record) => {
    let firstName = 'Chirag';
    let lastName = 'Sharma';
    let phoneNumber = '1234';

    try {
        let newContact = record.create({
            type: record.Type.CONTACT
        });

        newContact.setValue({
            fieldId: 'firstname',
            value: firstName
        })

        newContact.setValue({
            fieldId: 'lastname',
            value: lastName
        })

        newContact.setValue({
            fieldId: 'phone number',
            value: phoneNumber
        })

        newContact.setValue({
            fieldId: 'email',
            value: 'chirag@gmail.com'
        })

        newContact.setValue({
            fieldId: 'Company',
            value: 'lipi'
        })

        newContact.setValue({
            fieldId: 'Subsidiary',
            value: 1
        })

        let newRecord = newContact.save();

        log.debug({
            title: 'Record successfully saved',
            details: newRecord
        })

        if(newRecord) {
            let phoneCall = record.create({
                type: record.Type.PHONE_CALL
            })

            phoneCall.setValue({
                fieldId: 'title',
                value: 'New contact call'
            })

            phoneCall.setValue({
                fieldId: 'phone',
                value: phoneNumber
            })

            phoneCall.setValue({
                fieldId: 'assigned',
                value: 10
            })

            phoneCall.setValue({
                fieldId: 'message',
                value: `Call ${firstName} ${lastName} to setup a new account`
            });

            let newPhoneCall = phoneCall.save()

            log.debug({
                title: 'Follow-up phone call generated',
                details: newPhoneCall
            })
        }

    } catch(error) {
        log.error({
            title: error.name,
            details: error.message
        })
    }
});



// to delete record
require(['N/record'], function(record) {
    let deleteContact = record.delete({
        type: record.TYPE.CONTACT,
        id: 1693
    });

    log.debug({
        title: 'Record deleted',
        details: deleteContact
    });
});


require(['N/record'], (record) => {
    let newContact = record.create({

    })
})