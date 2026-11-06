-- Read-only checks after scripts/crm-legacy-to-crm2.sql. Every query should return what its comment says.

-- 1. Old leads against imported leads, per tenant: both numbers must be equal.
SELECT o.tenant,
       o.n AS old_leads,
       COALESCE(n.n, 0) AS imported_leads
FROM (SELECT tenant, COUNT(*) AS n FROM crm_leads GROUP BY tenant) o
LEFT JOIN (SELECT tenant, COUNT(*) AS n FROM crm2_leads WHERE id LIKE 'mig-%' GROUP BY tenant) n
  ON n.tenant = o.tenant;

-- 2. Old leads that were not imported: must return no rows.
SELECT l.id, l.tenant FROM crm_leads l
WHERE NOT EXISTS (SELECT 1 FROM crm2_leads n WHERE n.id = 'mig-' || l.id);

-- 3. Customer messages: old contacts against imported inquiry activities (equal).
SELECT (SELECT COUNT(*) FROM crm_lead_contacts) AS old_contacts,
       (SELECT COUNT(*) FROM crm2_activities WHERE id LIKE 'mig-c-%') AS imported_contacts;

-- 4. Imported activities that point at a lead that does not exist: must return no rows.
SELECT a.id FROM crm2_activities a
WHERE a.lead_id LIKE 'mig-%' AND NOT EXISTS (SELECT 1 FROM crm2_leads n WHERE n.id = a.lead_id);

-- 5. How the old stages landed in the new pipeline.
SELECT l.stage AS old_stage, n.stage AS new_stage, COUNT(*) AS leads
FROM crm_leads l JOIN crm2_leads n ON n.id = 'mig-' || l.id
GROUP BY l.stage, n.stage ORDER BY leads DESC;

-- 6. Open leads that ended up with neither an owner nor a place in the pool: must return no rows.
SELECT id FROM crm2_leads
WHERE id LIKE 'mig-%' AND stage NOT IN ('WON', 'LOST') AND owner IS NULL AND pooled_at IS NULL;

-- 7. Leads without a name or with an unknown source label (review by eye).
SELECT id, full_name, source FROM crm2_leads
WHERE id LIKE 'mig-%' AND (full_name = 'Khách chưa có tên' OR source NOT IN ('Facebook', 'Zalo OA', 'Website', 'Quảng cáo', 'Nhập tay'));
