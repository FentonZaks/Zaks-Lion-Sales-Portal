# Customer Creation Guide

This guide outlines the end-to-end process for creating a new customer, from the initial request by a Sales Representative in the Sales Portal CRM to the final import into NetSuite by an Administrator.

---

## Part 1: For Sales Representatives

As a Sales Representative, you will use the Sales Portal to submit new customer requests. The portal ensures all necessary logistical and accounting information is captured before the account is built in NetSuite.

### 1. Accessing the Form
Log in to the Zaks Sales Portal and click on the **New Customer** button or navigate to the New Customer page.

### 2. Filling out the Application
Please ensure the following fields are filled out accurately:
* **Company Name (NetSuite):** The main "Doing Business As" (DBA) name of the store. This is how it will appear on invoices and in the system.
* **Legal Name:** The official registered legal entity name of the corporation.
* **Shipping & Logistics:** Provide the full address. **Note:** Ensure the correct Canadian Province or Territory is selected from the dropdown list. The Country is locked to Canada by default.
* **Categorization:** Select the appropriate **Banner**, **Channel**, and **Price Level**. (Price Level defaults to *Store*).
* **Sales Rep:** Select your own name from the dropdown.
* **Contacts:**
  * **Primary Contact:** The main day-to-day contact for the store (requires First Name, Last Name, Email, and Phone).
  * **Accounts Payable (AP) Contact:** The person or department responsible for paying invoices. It is critical to get accurate email and phone information here for the accounting team.

### 3. Submission & Workflow
When you click **Create Customer Request**, the following happens automatically:
1. The request is securely saved in the portal's pending database.
2. A system email is generated and sent to the Administration team (`bryan@zaksfoods.ca`).
3. This email contains a formatted **PDF Summary** for quick review and a **CSV Data File** containing the exact data needed for NetSuite.

Your job is done! The Admin team will take over from here.

---

## Part 2: For Administrators

As an Administrator, your role is to review the incoming request, verify the data integrity, and execute the automated Suitelet import to build the customer in NetSuite.

### 1. Receiving & Reviewing the Request
When a Sales Rep submits a new customer, you will receive an email with two attachments:
* **PDF Summary:** Use this to quickly glance over the request and ensure it makes sense.
* **CSV File:** This contains the raw data to be imported.

### 2. Verifying the Data (Optional but Recommended)
Open the attached **CSV File** (you can safely use Microsoft Excel) and verify the following:
* **Spelling & Formatting:** Ensure the names and addresses are capitalized correctly.
* **Data Placement:** Verify a phone number wasn't accidentally typed into an email field, or a city wasn't typed into the address line.
* **Corrections:** If you spot an error, simply fix it directly in Excel and hit **Save**. 

*Technical Note:* Our custom NetSuite Suitelet is designed to safely handle standard Excel CSVs (unquoted fields) and will automatically translate full province names (like "Alberta") into the strict 2-letter codes ("AB") that NetSuite requires.

### 3. Importing into NetSuite
Once you are satisfied with the CSV file, it's time to build the record:
1. Log in to your NetSuite environment.
2. Navigate to the custom Suitelet: **Sales Portal: Create Customer from CSV**. *(Tip: Bookmark this Suitelet URL for fast access).*
3. On the Suitelet page, click **Choose File** and select your reviewed CSV file.
4. Click the **Create Customer** button.

### 4. Post-Import Verification
The Suitelet will process the file in seconds. Upon success, it will display a **Success!** screen containing a direct link to the newly created Customer Record.

Click the link and quickly verify that the automated system performed the following correctly:
* **Subsidiary:** Defaulted to `Zaks Foods ULC`.
* **Legal Name:** Captured and stored safely in the `Comments` field.
* **Categorizations:** Banner, Channel, and Price Level are mapped accurately.
* **Address Book:** The shipping address was imported and correctly flagged as both **Default Billing** and **Default Shipping**.
* **Contacts:** Two distinct NetSuite Contact records were created and attached to the Customer (one for Primary Contact, one for AP Contact). The AP Email was correctly assigned to the Custom Invoice Email field.

Once verified, the customer is fully active in NetSuite. They will automatically appear in the Sales Portal for all reps during the next nightly sync!
