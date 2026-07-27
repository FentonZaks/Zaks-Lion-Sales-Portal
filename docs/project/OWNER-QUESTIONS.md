# Owner Questions

| Question ID | Category | Question | Why needed | Blocking? | Date asked | Answer | Status |
| ----------- | -------- | -------- | ---------- | --------- | ---------- | ------ | ------ |
| Q-001 | Branding | What exact company name and branding should appear in the portal? | Required for UI setup | Yes | 2026-07-24 | Zaks / Lion Sales Portal (Logos provided) | Answered |
| Q-002 | Infrastructure | What company domain or subdomain should ultimately host the portal? | DNS and Hosting setup | Yes | 2026-07-24 | Leaning towards sales.zaksfoods.ca (not finalized) | Answered 
|
| Q-003 | Security | What email domain or domains should be eligible for access? | Access control | Yes | 2026-07-24 | Admin excel sheet for users. Mostly @zaksfoods.ca but also @gmail.com | Answered 
|
| Q-004 | Security | Should access require both an approved email list and a company-domain match? | Security policy | No | 2026-07-24 | No, only an approved email list (since some domains are gmail) | Answered 
|
| Q-005 | Security | Should users sign in with Google, Microsoft, email/password, one-time email code or a combination? | Authentication setup | Yes | 2026-07-24 | Email/password with 2FA code linking to cell/email refreshing every 30 days | Answered 
|
| Q-006 | Scope | Approximately how many sales representatives will use the first release? | Capacity planning | No | 2026-07-24 | 10 reps to start | Answered 
|
| Q-007 | Scope | Approximately how many managers, administrators and order-entry employees will use it? | Role setup | No | 2026-07-24 | 3 Managers, 2 Administrators, 2 Order-entry employees | Answered 
|
| Q-008 | Data Model | How are sales territories currently defined? | RLS and permissions | Yes | 2026-07-24 | Each customer allocated to a specific rep, but some reps share access (not perfect 1-to-1) | Answered 
|
| Q-009 | Data Model | Can more than one sales representative have access to the same customer? | Data modeling | Yes | 2026-07-24 | Yes, multiple reps can have access to the same customer | Answered 
|
| Q-010 | Permissions | Should managers see only their region or the full national sales organization? | Manager scope | Yes | 2026-07-24 | Managers should see full organization | Answered 
|
| Q-011 | Permissions | Should representatives see customer payment terms? | Data exposure | No | 2026-07-24 | Yes, they should see customer payment terms | Answered 
|
| Q-012 | Permissions | Should representatives see open balances or only a simple credit-hold indicator? | Data exposure | Yes | 2026-07-24 | Yes, they should see open balances | Answered 
|
| Q-013 | Permissions | Should representatives see previous sales-order values and invoice history? | Data exposure | No | 2026-07-24 | Yes, they should see previous sales-order values and invoice history | Answered 
|
| Q-014 | Permissions | How many years or months of customer sales history should be visible? | Database capacity | No | 2026-07-24 | 2 years of sales history | Answered 
|
| Q-015 | Business Rules | Should sales representatives be allowed to override prices? | Order logic | Yes | 2026-07-24 | Yes, but they must provide a comment when overriding | Answered 
|
| Q-016 | Business Rules | If price overrides are permitted, what approval process is required? | Workflow design | Yes | 2026-07-24 | No formal approver, just the requirement for a comment | Answered 
|
| Q-017 | Business Rules | Should orders be entered by individual units, inner packs, master cases or all supported units? | Product modeling | Yes | 2026-07-24 | Orders entered on all supported units, but CSV/NetSuite integration done at individual level. Also need Item groups (kits) with quantities and individual items that make up the kit. | Answered 
|
| Q-018 | Business Rules | Are there minimum order quantities, minimum order values or case-pack rules? | Validation rules | Yes | 2026-07-24 | None currently, but future minimums based on dollars, inners/cartons for stores, master cases for distributors | Answered 
|
| Q-019 | UI/UX | Should the portal display estimated inventory availability in Phase 1? | NetSuite integration | No | 2026-07-24 | Yes, display estimated inventory based on ship from location | Answered 
|
| Q-020 | Business Rules | Should freight be estimated, entered manually or excluded from portal totals? | Order totals logic | Yes | 2026-07-24 | Excluded from portal totals on the front end | Answered 
|
| Q-021 | Business Rules | Should taxes be shown as an estimate or left to NetSuite? | Order totals logic | No | 2026-07-24 | Left to NetSuite. Note: *Plus all applicable taxes* | Answered 
|
| Q-022 | Roles | Who will act as the internal order-entry reviewer? | Workflow assignment | Yes | 2026-07-24 | TBC, but they will have separate access to the portal for this | Answered 
|
| Q-023 | Integration | Should approved requests produce one CSV per order or a batch CSV containing multiple orders? | Export format | Yes | 2026-07-24 | Batch CSV containing multiple orders | Answered 
|
| Q-024 | Integration | Is a NetSuite sandbox account available? | Safe testing | Yes | 2026-07-24 | Yes, Sandbox is available | Answered 
|
| Q-025 | Integration | Which NetSuite subsidiary or subsidiaries should be included? | Data scoping | Yes | 2026-07-24 | All subsidiaries | Answered 
|
| Q-026 | Integration | Which NetSuite customer form, item fields and sales-order form are currently used? | Data mapping | Yes | 2026-07-24 | Extract a sample CSV with relevant fields to be used as a separate project. Must remain flexible to add/remove/change fields. | Answered 
|
| Q-027 | Integration | Are customer territories and assigned sales representatives already maintained accurately in NetSuite? | Data synchronization | No | 2026-07-24 | Yes, maintained accurately in NetSuite (1 source of truth) | Answered 
|
| Q-028 | Integration | Is customer-specific pricing stored directly on customer-item pricing, through price levels or through custom records? | Price sync logic | Yes | 2026-07-24 | Stored in both customer-item pricing and price levels | Answered 
|
| Q-029 | Integration | Are units of measure and case-pack information consistently maintained in NetSuite? | Order validation | Yes | 2026-07-24 | Some gaps exist. Will create custom fields if needed to ensure compliance. | Answered 
|
| Q-030 | Integration | Are item images currently stored in NetSuite, the company website, Google Drive or another system? | Media serving | Yes | 2026-07-24 | Images stored on the company website | Answered 
|
| Q-031 | Infrastructure | Does the current Lovable website project already have a connected GitHub repository? | CI/CD setup | Yes | 2026-07-24 | No connected GitHub repository currently | Answered 
|
| Q-032 | Infrastructure | Is the portal intended to be part of the same repository as the public website or a separate application and repository? | Architecture | Yes | 2026-07-24 | Separate application and repository | Answered 
|
| Q-033 | Infrastructure | Is Lovable Cloud currently being used, or is the project connected to a separate Supabase project? | Backend setup | Yes | 2026-07-24 | TBC closer to launch of Lovable site config | Answered 
|
| Q-034 | Infrastructure | Which person or company currently controls the website, GitHub, domain and Lovable accounts? | Access request | Yes | 2026-07-24 | Will have them transferred directly to our company | Answered 
|
