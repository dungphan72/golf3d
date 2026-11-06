-- Removes everything scripts/crm-legacy-to-crm2.sql imported: only rows whose id starts with 'mig-'.
-- Rows created in the CRM module itself have random ids and are never touched.
--
-- Warning: anything staff changed on an imported lead after the import (a call result, a new owner, a note)
-- is deleted with it. The old CRM tables are untouched, so the import can be run again afterwards.
DELETE FROM crm2_activities WHERE id LIKE 'mig-%' OR lead_id LIKE 'mig-%';
DELETE FROM crm2_tasks WHERE lead_id LIKE 'mig-%';
DELETE FROM crm2_leads WHERE id LIKE 'mig-%';
