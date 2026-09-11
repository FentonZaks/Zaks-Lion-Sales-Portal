# Global Workspace Rules

All agents must follow the principles in the PROJECT-CHARTER.md.
# Data Sync Filters
When extracting customer data from NetSuite, always ensure the script filters for active customers only (e.g. ['isinactive', 'is', 'F']). If an 'Inactive Accounts / Win-back' dashboard is requested in the future, remove or toggle this filter to pull inactive customers.

# NetSuite Tooling
The user has the Tim Dietrich SuiteQL Query Tool installed in their NetSuite environment. When they request complex NetSuite data extraction, you can provide SuiteQL queries for them to easily run via this tool.

# NetSuite Secrets Management
NEVER hardcode API keys or secrets (like the Supabase Service Key) directly into NetSuite SuiteScripts. Always use NetSuite Script Parameters (`custscript_...`) via `N/runtime` to dynamically pull the keys securely from the Script Deployment record at runtime.
