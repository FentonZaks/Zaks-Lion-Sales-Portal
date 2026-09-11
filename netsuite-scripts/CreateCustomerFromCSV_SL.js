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
                var companyName = toTitleCase(parsedData['Customer Name'] || 'Unknown Company');
                custRec.setValue({ fieldId: 'companyname', value: companyName });
                custRec.setValue({ fieldId: 'subsidiary', value: 2 }); // Zaks Foods ULC
                if (parsedData['Primary Email']) custRec.setValue({ fieldId: 'email', value: parsedData['Primary Email'] });
                if (parsedData['Primary Phone']) custRec.setValue({ fieldId: 'phone', value: parsedData['Primary Phone'] });
                
                // Append Legal Name to Comments
                if (parsedData['Legal Name']) {
                    var legalName = toTitleCase(parsedData['Legal Name']);
                    custRec.setValue({ fieldId: 'comments', value: 'Legal Name: ' + legalName });
                }

                // Custom Fields
                if (parsedData['Banner']) custRec.setValue({ fieldId: 'custentity2', value: parsedData['Banner'].trim() });
                if (parsedData['Channel']) custRec.setValue({ fieldId: 'custentity5', value: parsedData['Channel'].trim() });
                if (parsedData['AP Email']) custRec.setValue({ fieldId: 'custentity_atlas_customer_invoice_email', value: parsedData['AP Email'] });
                
                // Map and set Price Level
                if (parsedData['Price Level']) {
                    var priceLevelId = mapPriceLevel(parsedData['Price Level']);
                    if (priceLevelId) {
                        custRec.setValue({ fieldId: 'pricelevel', value: priceLevelId });
                    }
                }
                
                // Map and set Sales Rep
                if (parsedData['Sales Rep']) {
                    var salesRepId = mapSalesRep(parsedData['Sales Rep']);
                    if (salesRepId) {
                        custRec.setValue({ fieldId: 'salesrep', value: salesRepId });
                    }
                }
                
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
                    if (parsedData['Province']) addressSubrecord.setValue({ fieldId: 'state', value: normalizeProvince(parsedData['Province']) });
                    if (parsedData['Postal Code']) addressSubrecord.setValue({ fieldId: 'zip', value: formatPostalCode(parsedData['Postal Code']) });
                    
                    custRec.commitLine({ sublistId: 'addressbook' });
                }

                var customerId = custRec.save();
                log.audit('Customer Created', 'ID: ' + customerId);

                // Create Contacts
                createContact(parsedData['Primary Contact First'], parsedData['Primary Contact Last'], parsedData['Primary Email'], parsedData['Primary Phone'], customerId, 'Primary Contact');
                createContact(parsedData['AP First Name'], parsedData['AP Last Name'], parsedData['AP Email'], parsedData['AP Phone'], customerId, 'AP Contact');

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
            
            // If NetSuite blocked it due to duplicate name/email, force uniqueness and retry
            try {
                var retryRec = record.create({ type: record.Type.CONTACT, isDynamic: true });
                retryRec.setValue({ fieldId: 'company', value: customerId });
                retryRec.setValue({ fieldId: 'firstname', value: firstName || 'N/A' });
                var forcedLastName = (lastName || 'N/A') + ' (' + title + ')';
                retryRec.setValue({ fieldId: 'lastname', value: forcedLastName });
                retryRec.setValue({ fieldId: 'email', value: email || '' });
                retryRec.setValue({ fieldId: 'phone', value: phone || '' });
                retryRec.setValue({ fieldId: 'title', value: title });
                retryRec.save();
            } catch (e2) {
                log.error('Error creating contact on retry', e2);
            }
        }
    }

    function normalizeProvince(prov) {
        if (!prov) return '';
        var p = prov.trim().toUpperCase();
        var map = {
            'ALBERTA': 'AB',
            'BRITISH COLUMBIA': 'BC',
            'MANITOBA': 'MB',
            'NEW BRUNSWICK': 'NB',
            'NEWFOUNDLAND AND LABRADOR': 'NL',
            'NEWFOUNDLAND & LABRADOR': 'NL',
            'NEWFOUNDLAND': 'NL',
            'NOVA SCOTIA': 'NS',
            'ONTARIO': 'ON',
            'PRINCE EDWARD ISLAND': 'PE',
            'PEI': 'PE',
            'QUEBEC': 'QC',
            'SASKATCHEWAN': 'SK',
            'NORTHWEST TERRITORIES': 'NT',
            'NUNAVUT': 'NU',
            'YUKON': 'YT'
        };
        return map[p] || p;
    }

    function toTitleCase(str) {
        if (!str) return str;
        return str.toLowerCase().split(' ').map(function(word) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }

    function formatPostalCode(str) {
        if (!str) return str;
        // Remove all non-alphanumeric characters, convert to uppercase
        var cleaned = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        // If it's a standard 6-character Canadian postal code, format it as A1A 1A1
        if (cleaned.length === 6) {
            return cleaned.substring(0, 3) + ' ' + cleaned.substring(3);
        }
        
        // Otherwise, just return the uppercase string as fallback
        return cleaned;
    }

    function mapPriceLevel(name) {
        if (!name) return null;
        var n = name.trim().toLowerCase();
        var map = {
            'retail': 1,
            'store': 2,
            'distributor': 3,
            'masterdist': 4,
            'online price': 5,
            'ctire': 8,
            'pafinefoods': 9,
            'otherdist': 10,
            'fitc': 11,
            'wholesale': 14,
            'canco price': 18
        };
        return map[n] || null;
    }

    function mapSalesRep(name) {
        if (!name) return null;
        var n = name.trim().toLowerCase();
        var map = {
            'tait fazio': -5,
            'ryan sweeney': 2936,
            'landon king': 2941,
            'rickie hollait': 2942,
            'chris adams': 2943,
            'up next sales': 2946,
            'zaks house account': 2947,
            'lion house account': 2948,
            'walgreen rep': 2949,
            'michael delegans': 4372,
            'timothy simpson': 4664,
            'jarvis': 5410
        };
        return map[n] || null;
    }

    return {
        onRequest: onRequest
    };
});
