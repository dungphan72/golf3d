-- Removes the tasks and notes scripts/crm-care-to-crm2.sql imported: only rows whose id starts with 'mig-'.
-- Care tasks and notes created in the CRM module itself have random ids and are never touched.
--
-- Warning: what staff did to an imported task after the import (claimed, snoozed, finished) goes with it.
-- Settings and staff details copied by the import are left in place: they are ordinary settings now.
DELETE FROM crm2_customer_notes WHERE id LIKE 'mig-%';
DELETE FROM crm2_tasks WHERE id LIKE 'mig-%' AND customer_id IS NOT NULL;
