# RLS Matrix
- Sales Rep: SELECT/INSERT/UPDATE on OrderRequests where user_id = auth.uid(). SELECT on Customers where customer_id in UserCustomers mapping.
- Manager: SELECT on all.