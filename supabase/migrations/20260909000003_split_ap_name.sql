-- Migration: Split AP Name into First and Last Name for better NetSuite contact creation
ALTER TABLE pending_customers 
ADD COLUMN ap_first_name text,
ADD COLUMN ap_last_name text;
