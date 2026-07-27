# Assumptions

| Assumption ID | Assumption | Reason for assumption | Risk if incorrect | Project area affected | Owner confirmation required | Date created | Status |
| ------------- | ---------- | --------------------- | ----------------- | --------------------- | --------------------------- | ------------ | ------ |
| A-001 | The portal will use a separate secured subdomain. | Standard security practice | DNS reconfiguration | Infrastructure | Yes | 2026-07-24 | Open |
| A-002 | The portal will be separate from the public website's navigation. | Security isolation | UI rework | UI/UX | Yes | 2026-07-24 | Open |
| A-003 | Every user will have an individual login. | Accountability | Missing audit trails | Security | Yes | 2026-07-24 | Open |
| A-004 | An approved-email list will be required. | Strict access control | Unauthorized access | Security | Yes | 2026-07-24 | Open |
| A-005 | Sales representatives will have territory-restricted access. | Business requirement | Data leakage | Data Model/RLS | Yes | 2026-07-24 | Open |
| A-006 | Phase 1 will not create NetSuite transactions automatically. | Scope constraint | Huge integration delays | Integration | Yes | 2026-07-24 | Open |
| A-007 | Customer, item and simplified pricing data will sync one way from NetSuite. | NetSuite is source of truth | Data inconsistency | Integration | Yes | 2026-07-24 | Open |
| A-008 | Orders will be submitted into a portal review queue. | Validation requirement | Invalid orders | Backend Logic | Yes | 2026-07-24 | Open |
| A-009 | An internal employee will review and enter or import orders into NetSuite. | Manual bridge for Phase 1 | Missing orders | Workflow | Yes | 2026-07-24 | Open |
| A-010 | The NetSuite sales-order number will be recorded in the portal. | Reference integrity | Lost track of orders | Database | Yes | 2026-07-24 | Open |
| A-011 | NetSuite remains the financial system of record. | Best practice | Audit failures | Architecture | Yes | 2026-07-24 | Open |
| A-012 | The portal will use Canadian English. | Target audience | Localization fixes | Frontend | No | 2026-07-24 | Open |
| A-013 | Currency will initially be Canadian dollars unless customer data requires otherwise. | Domestic sales default | Math errors | Frontend/DB | Yes | 2026-07-24 | Open |
| A-014 | Dates will display in the business user's local Canadian time zone. | UX requirement | Confusion on deadlines | Frontend | No | 2026-07-24 | Open |
| A-015 | Continuous GPS tracking is excluded. | Privacy decision | Scope creep | Mobile App | Yes | 2026-07-24 | Open |
| A-016 | Production customer data will not be used during early development. | Security standard | Data breach risk | Infrastructure | Yes | 2026-07-24 | Open |
| A-017 | A targeted professional security review will occur before production deployment. | Quality assurance | Exploitable bugs | Release | Yes | 2026-07-24 | Open |
