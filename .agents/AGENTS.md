# Global Workspace Rules

All agents must follow the principles in the PROJECT-CHARTER.md.
# Data Sync Filters
When extracting customer data from NetSuite, always ensure the script filters for active customers only (e.g. ['isinactive', 'is', 'F']). If an 'Inactive Accounts / Win-back' dashboard is requested in the future, remove or toggle this filter to pull inactive customers.
