/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * 
 * Description: Parses the Sales Portal standard CSV and creates a Customer, Address, and Contacts.
 */

define(['N/ui/serverWidget', 'N/record', 'N/file', 'N/log', 'N/redirect'], 
function(serverWidget, record, file, log, redirect) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var form = serverWidget.createForm({
                title: 'Sales Portal: Create Customer from CSV'
            });

            form.addField({
                id: 'custpage_csv_file',
                type: serverWidget.FieldType.FILE,
                label: 'Upload CSV File'
            });

            form.addSubmitButton({
                label: 'Create Customer'
            });

            context.response.writePage(form);
            return;
        }

        if (context.request.method === 'POST') {
            try {
                var fileObj = context.request.files.custpage_csv_file;
                if (!fileObj) {
                    throw new Error("No file uploaded.");
                }

                var fileContent = fileObj.getContents();
                var lines = fileContent.split('\n');
                var parsedData = {};

                // Parse standard Field,Value layout (skipping header)
                for (var i = 1; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (!line) continue;
                    
                    // Support both quoted ("Field","Value") and unquoted (Field,Value) from Excel
                    var key = '';
                    var val = '';
                    
                    if (line.indexOf('"') !== -1) {
                        var matches = line.match(/"(.*?)"\s*,\s*"(.*?)"/);
                        if (matches && matches.length >= 3) {
                            key = matches[1];
                            val = matches[2];
                        }
                    } else {
                        var parts = line.split(',');
                        if (parts.length >= 2) {
                            key = parts[0].trim();
                            val = parts.slice(1).join(',').trim(); // join rest in case of extra commas
                        }
                    }
                    
                    if (key) {
                        parsedData[key] = val;
                    }
                }

                log.debug('Parsed CSV Data', parsedData);

                // Create Customer Record
                var custRec = record.create({
                    type: record.Type.CUSTOMER,
                    isDynamic: true
                });

                // Standard Fields
                custRec.setValue({ fieldId: 'companyname', value: parsedData['Customer Name'] || 'Unknown Company' });
                custRec.setValue({ fieldId: 'subsidiary', value: 2 }); // Zaks Foods ULC
                if (parsedData['Primary Email']) custRec.setValue({ fieldId: 'email', value: parsedData['Primary Email'] });
                if (parsedData['Primary Phone']) custRec.setValue({ fieldId: 'phone', value: parsedData['Primary Phone'] });
                
                // Append Legal Name to Comments
                if (parsedData['Legal Name']) {
                    custRec.setValue({ fieldId: 'comments', value: 'Legal Name: ' + parsedData['Legal Name'] });
                }

                // Custom Fields
                if (parsedData['Banner']) custRec.setValue({ fieldId: 'custentity2', value: parsedData['Banner'].trim() });
                if (parsedData['Channel']) custRec.setValue({ fieldId: 'custentity5', value: parsedData['Channel'].trim() });
                if (parsedData['AP Email']) custRec.setValue({ fieldId: 'custentity_atlas_customer_invoice_email', value: parsedData['AP Email'] });
                
                // Address Book
                if (parsedData['Shipping Address']) {
                    custRec.selectNewLine({ sublistId: 'addressbook' });
                    custRec.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: 'defaultshipping', value: true });
                    custRec.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: 'defaultbilling', value: true });
                    
                    var addressSubrecord = custRec.getCurrentSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress'
                    });
                    
                    addressSubrecord.setValue({ fieldId: 'country', value: 'CA' }); // Defaulting to Canada
                    if (parsedData['Shipping Address']) addressSubrecord.setValue({ fieldId: 'addr1', value: parsedData['Shipping Address'] });
                    if (parsedData['City']) addressSubrecord.setValue({ fieldId: 'city', value: parsedData['City'] });
                    if (parsedData['Province']) addressSubrecord.setValue({ fieldId: 'state', value: parsedData['Province'] });
                    if (parsedData['Postal Code']) addressSubrecord.setValue({ fieldId: 'zip', value: parsedData['Postal Code'] });
                    
                    custRec.commitLine({ sublistId: 'addressbook' });
                }

                var customerId = custRec.save();
                log.audit('Customer Created', 'ID: ' + customerId);

                // Create Contacts
                createContact(parsedData['Primary Contact First'], parsedData['Primary Contact Last'], parsedData['Primary Email'], parsedData['Primary Phone'], customerId, 'Primary Contact');
                createContact(parsedData['AP Name'] ? parsedData['AP Name'].split(' ')[0] : '', parsedData['AP Name'] ? parsedData['AP Name'].split(' ').slice(1).join(' ') : '', parsedData['AP Email'], parsedData['AP Phone'], customerId, 'AP Contact');

                // Success Response
                context.response.write('<h2>Success!</h2><p>Customer successfully created. <a href="/app/common/entity/custjob.nl?id=' + customerId + '">Click here to view Customer Record</a></p><br/><a href="javascript:history.back()">Go Back</a>');

            } catch (e) {
                log.error('Error Processing CSV', e);
                context.response.write('<h2>Error Processing CSV</h2><p>' + e.message + '</p><br/><a href="javascript:history.back()">Go Back</a>');
            }
        }
    }

    function createContact(firstName, lastName, email, phone, customerId, title) {
        if (!firstName && !lastName && !email) return;

        try {
            var contactRec = record.create({ type: record.Type.CONTACT, isDynamic: true });
            contactRec.setValue({ fieldId: 'company', value: customerId });
            contactRec.setValue({ fieldId: 'firstname', value: firstName || 'N/A' });
            contactRec.setValue({ fieldId: 'lastname', value: lastName || 'N/A' });
            contactRec.setValue({ fieldId: 'email', value: email || '' });
            contactRec.setValue({ fieldId: 'phone', value: phone || '' });
            contactRec.setValue({ fieldId: 'title', value: title });
            contactRec.save();
        } catch (e) {
            log.error('Error creating contact', e);
        }
    }

    return {
        onRequest: onRequest
    };
});
