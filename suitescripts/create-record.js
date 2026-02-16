define([], function() {
    function execute(context) {
        var rec = record.create({
            type: 'salesorder',
            isDynamic: true
        })

        rec.setValue({
            fieldId: 'entity',
            value: 325
        })
    }
})