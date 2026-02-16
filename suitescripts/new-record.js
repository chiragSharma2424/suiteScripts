require(['N/record'], (record) => {
    let newContact = record.create({ type: record.Type.CONTACT });
    newContact.setValue({ fieldId: 'firstname', value: 'jeff' });
    newContact.setValue({ fieldId: 'lastname', value: 'smith' });
    newContact.setValue({ fieldId: 'subsidiary', value: 1 });
})