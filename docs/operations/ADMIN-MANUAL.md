# Administrator Manual: New Customer Import

As an Administrator, your role is to review incoming customer requests submitted by Sales Representatives through the Sales Portal CRM, verify the data integrity, and execute the automated Suitelet import to build the customer in NetSuite.

## 1. Receiving & Reviewing the Request
When a Sales Rep submits a new customer, you will receive an email containing two attachments:
* **PDF Summary:** Use this to quickly glance over the request and ensure it makes sense contextually.
* **CSV File:** This contains the raw data required for the NetSuite import.

## 2. Verifying the Data (Optional but Recommended)
Open the attached **CSV File** (Microsoft Excel is fully supported) and verify the following:
* **Spelling & Formatting:** Ensure the names, addresses, and cities are capitalized correctly.
* **Data Placement:** Verify a phone number wasn't accidentally typed into an email field, or a city wasn't typed into the address line.
* **Corrections:** If you spot an error, simply fix it directly in Excel and hit **Save**. 

*Technical Note:* Our custom NetSuite Suitelet is designed to safely handle standard Excel CSVs (unquoted fields) and will automatically translate full province names (like "Alberta") into the strict 2-letter codes ("AB") that NetSuite requires.

## 3. Importing into NetSuite
Once you are satisfied with the CSV file, you will use the custom NetSuite tool to build the record:
1. Log in to your NetSuite environment.
2. Navigate to the custom Suitelet: **Sales Portal: Create Customer from CSV**. *(Tip: Bookmark this Suitelet URL for fast access).*
3. On the Suitelet page, click **Choose File** and select your reviewed CSV file.
4. Click the **Create Customer** button.

## 4. Post-Import Verification
The Suitelet will process the file in seconds. Upon success, it will display a **Success!** screen containing a direct link to the newly created Customer Record.

Click the link and quickly verify that the automated system performed the following correctly:
* **Subsidiary:** Defaulted to `Zaks Foods ULC`.
* **Legal Name:** Captured and stored safely in the `Comments` field.
* **Categorizations:** Banner, Channel, and Price Level are mapped accurately.
* **Address Book:** The shipping address was imported and correctly flagged as both **Default Billing** and **Default Shipping**.
* **Contacts:** Two distinct NetSuite Contact records were created and attached to the Customer (one for Primary Contact, one for AP Contact). The AP Email was correctly assigned to the Custom Invoice Email field.

Once verified, the customer is fully active in NetSuite. They will automatically sync back to the Sales Portal CRM during the next automated nightly data refresh.
