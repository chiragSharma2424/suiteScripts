// require(['N/record'], (record) => {
//     let oldContact = record.load({
//         type: record.Type.CONTACT,
//         id: 1693
//     })

//     let name = oldContact.getValue('entityid');
//     let email = oldContact.getValue('email');
//     let phone = oldContact.getValue('phone');
//     let company = oldContact.getText('company');

//     log.debug({
//         title: 'Contact record details',
//         details: `${name} works here ${company} and can be reached at ${email} or ${phone}`
//     })
// });