# Phase 0: Gate 0 Owner Decision Package

## 1. What was completed
We have completed Phase 0 (Discovery and workspace inspection) of the Lion Imports Field Sales Portal project. 

## 2. What changed
- We established the multi-agent development structure (`/.agents/`).
- We established the foundational project documentation (`/docs/`).
- We assessed the repository (currently empty; no pre-existing code, Lovable project, or stack).

## 3. Recommended Architecture
Based on the absence of existing code and the need for a scalable, mobile-first Field Sales Portal with robust security and row-level access control, we recommend:
- **Frontend:** React + TypeScript (mobile-first, responsive)
- **Backend/DB:** Supabase (PostgreSQL with Row-Level Security, Edge Functions for business logic, Supabase Auth)
- **Integration Layer:** Secure Edge Functions for interacting with NetSuite API (OAuth 2.0).
- **Source Control:** Git/GitHub

## 4. Open Risks
- No integration sandbox details are yet available. We must ensure we have a NetSuite sandbox account to test integration safely.
- Data mapping complexities between NetSuite's custom fields and the portal.

## 5. Assumptions
We have made several design assumptions for Phase 1 (e.g., Canadian Dollars/English, manual order review, NetSuite as the financial source of truth). Please review `/docs/project/ASSUMPTIONS.md` for a full list.

## 6. Decisions Required
Please review the questions in the sections below to proceed.

---

### <span style="color:red">**OWNER ACTION REQUIRED:** Confirm the approved company identity and domain information before authentication is configured for production.</span>
- <span style="color:blue">**Q-001:** What exact company name and branding should appear in the portal?</span> **[Answered: Zaks / Lion Sales Portal. Logos provided.]**
- <span style="color:blue">**Q-002:** What company domain or subdomain should ultimately host the portal?</span> **[Answered: Leaning towards sales.zaksfoods.ca (not finalized)]**
- <span style="color:blue">**Q-003:** What email domain or domains should be eligible for access?</span> **[Answered: Admin excel sheet for users. Mostly @zaksfoods.ca but also @gmail.com]**
- <span style="color:blue">**Q-004:** Should access require both an approved email list and a company-domain match?</span> **[Answered: No, only an approved email list (since some domains are gmail)]**
- <span style="color:blue">**Q-005:** Should users sign in with Google, Microsoft, email/password, one-time email code or a combination?</span> **[Answered: Email/password with 2FA code linking to cell/email refreshing every 30 days]**

### <span style="color:red">**OWNER ACTION REQUIRED:** Confirm the user population and territory structure.</span>
- <span style="color:blue">**Q-006:** Approximately how many sales representatives will use the first release?</span> **[Answered: 10 reps to start]**
- <span style="color:blue">**Q-007:** Approximately how many managers, administrators and order-entry employees will use it?</span> **[Answered: 3 Managers, 2 Administrators, 2 Order-entry employees]**
- <span style="color:blue">**Q-008:** How are sales territories currently defined?</span> **[Answered: Each customer allocated to a specific rep, but some reps share access (not perfect 1-to-1)]**
- <span style="color:blue">**Q-009:** Can more than one sales representative have access to the same customer?</span> **[Answered: Yes, multiple reps can have access to the same customer]**
- <span style="color:blue">**Q-010:** Should managers see only their region or the full national sales organization?</span> **[Answered: Managers should see full organization]**

### <span style="color:red">**OWNER ACTION REQUIRED:** Confirm the customer information that sales representatives are permitted to see.</span>
- <span style="color:blue">**Q-011:** Should representatives see customer payment terms?</span> **[Answered: Yes, they should see customer payment terms]**
- <span style="color:blue">**Q-012:** Should representatives see open balances or only a simple credit-hold indicator?</span> **[Answered: Yes, they should see open balances]**
- <span style="color:blue">**Q-013:** Should representatives see previous sales-order values and invoice history?</span> **[Answered: Yes, they should see previous sales-order values and invoice history]**
- <span style="color:blue">**Q-014:** How many years or months of customer sales history should be visible?</span> **[Answered: 2 years of sales history]**

### <span style="color:red">**OWNER ACTION REQUIRED:** Confirm the initial order-request rules.</span>
- <span style="color:blue">**Q-015:** Should sales representatives be allowed to override prices?</span> **[Answered: Yes, but they must provide a comment when overriding]**
- <span style="color:blue">**Q-016:** If price overrides are permitted, what approval process is required?</span> **[Answered: No formal approver, just the requirement for a comment]**
- <span style="color:blue">**Q-017:** Should orders be entered by individual units, inner packs, master cases or all supported units?</span> **[Answered: Orders entered on all supported units, but CSV/NetSuite integration done at individual level. Also need Item groups (kits) with quantities and individual items that make up the kit.]**
- <span style="color:blue">**Q-018:** Are there minimum order quantities, minimum order values or case-pack rules?</span> **[Answered: None currently, but future minimums based on dollars, inners/cartons for stores, master cases for distributors]**
- <span style="color:blue">**Q-019:** Should the portal display estimated inventory availability in Phase 1?</span> **[Answered: Yes, display estimated inventory based on ship from location]**
- <span style="color:blue">**Q-020:** Should freight be estimated, entered manually or excluded from portal totals?</span> **[Answered: Excluded from portal totals on the front end]**
- <span style="color:blue">**Q-021:** Should taxes be shown as an estimate or left to NetSuite?</span> **[Answered: Left to NetSuite. Note: *Plus all applicable taxes*]**
- <span style="color:blue">**Q-022:** Who will act as the internal order-entry reviewer?</span> **[Answered: TBC, but they will have separate access to the portal for this]**
- <span style="color:blue">**Q-023:** Should approved requests produce one CSV per order or a batch CSV containing multiple orders?</span> **[Answered: Batch CSV containing multiple orders]**

### <span style="color:red">**OWNER ACTION REQUIRED:** Confirm NetSuite environment and data availability.</span>
- <span style="color:blue">**Q-024:** Is a NetSuite sandbox account available?</span> **[Answered: Yes, Sandbox is available]**
- <span style="color:blue">**Q-025:** Which NetSuite subsidiary or subsidiaries should be included?</span> **[Answered: All subsidiaries]**
- <span style="color:blue">**Q-026:** Which NetSuite customer form, item fields and sales-order form are currently used?</span> **[Answered: Extract a sample CSV with relevant fields to be used as a separate project. Must remain flexible to add/remove/change fields.]**
- <span style="color:blue">**Q-027:** Are customer territories and assigned sales representatives already maintained accurately in NetSuite?</span> **[Answered: Yes, maintained accurately in NetSuite (1 source of truth)]**
- <span style="color:blue">**Q-028:** Is customer-specific pricing stored directly on customer-item pricing, through price levels or through custom records?</span> **[Answered: Stored in both customer-item pricing and price levels]**
- <span style="color:blue">**Q-029:** Are units of measure and case-pack information consistently maintained in NetSuite?</span> **[Answered: Some gaps exist. Will create custom fields if needed to ensure compliance.]**
- <span style="color:blue">**Q-030:** Are item images currently stored in NetSuite, the company website, Google Drive or another system?</span> **[Answered: Images stored on the company website]**

### <span style="color:red">**OWNER ACTION REQUIRED:** Confirm hosting and repository access.</span>
- <span style="color:blue">**Q-031:** Does the current Lovable website project already have a connected GitHub repository?</span> **[Answered: No connected GitHub repository currently]**
- <span style="color:blue">**Q-032:** Is the portal intended to be part of the same repository as the public website or a separate application and repository?</span> **[Answered: Separate application and repository]**
- <span style="color:blue">**Q-033:** Is Lovable Cloud currently being used, or is the project connected to a separate Supabase project?</span> **[Answered: TBC closer to launch of Lovable site config]**
- <span style="color:blue">**Q-034:** Which person or company currently controls the website, GitHub, domain and Lovable accounts?</span> **[Answered: Will have them transferred directly to our company]**

## 7. Recommended Next Action
Please review the questions above. You do not need to answer all of them instantly, but we need the ones marked **Blocking? (Yes)** in the OWNER-QUESTIONS.md to securely begin Phase 1 design. Once ready, approve the progression to Phase 1 (Business and technical design).
