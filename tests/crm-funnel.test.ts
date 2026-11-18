import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFunnelMetrics,
  computeStaffSla,
} from '../modules/crm/core/funnel.ts';

test('computeFunnelMetrics calculates exact 5-stage conversion rates and drop-offs', () => {
  const counts = {
    leads: 100,
    booked: 60,
    checkedIn: 45,
    paid: 36,
    retained: 18,
  };

  const res = computeFunnelMetrics(counts, 30);
  assert.equal(res.totalLeads, 100);
  assert.equal(res.finalRetained, 18);
  assert.equal(res.endToEndConversionRate, 18); // 18% end-to-end

  // Check each stage
  const [s1, s2, s3, s4, s5] = res.stages;

  // 1. Lead
  assert.equal(s1.count, 100);
  assert.equal(s1.conversionRate, 100);
  assert.equal(s1.overallRate, 100);

  // 2. Booking (60/100 = 60%)
  assert.equal(s2.count, 60);
  assert.equal(s2.conversionRate, 60);
  assert.equal(s2.dropoffRate, 40);
  assert.equal(s2.overallRate, 60);

  // 3. Check-in (45/60 = 75%)
  assert.equal(s3.count, 45);
  assert.equal(s3.conversionRate, 75);
  assert.equal(s3.dropoffRate, 25);
  assert.equal(s3.overallRate, 45);

  // 4. Payment (36/45 = 80%)
  assert.equal(s4.count, 36);
  assert.equal(s4.conversionRate, 80);
  assert.equal(s4.dropoffRate, 20);
  assert.equal(s4.overallRate, 36);

  // 5. Retention (18/36 = 50%)
  assert.equal(s5.count, 18);
  assert.equal(s5.conversionRate, 50);
  assert.equal(s5.dropoffRate, 50);
  assert.equal(s5.overallRate, 18);
});

test('computeFunnelMetrics is zero-division safe with empty data', () => {
  const res = computeFunnelMetrics({
    leads: 0,
    booked: 0,
    checkedIn: 0,
    paid: 0,
    retained: 0,
  });
  assert.equal(res.totalLeads, 0);
  assert.equal(res.endToEndConversionRate, 0);
  for (const s of res.stages) {
    if (s.key !== 'lead') {
      assert.equal(s.conversionRate, 0);
      assert.equal(s.overallRate, 0);
    }
  }
});

test('computeStaffSla computes accurate 5-minute SLA compliance rates', () => {
  const rows = [
    {
      userId: 'u1',
      name: 'Nguyễn Văn An',
      assigned: 20,
      responded: 19,
      under5m: 16,
      avgMin: 3.4,
      won: 8,
      revenue: 25000000,
    },
    {
      userId: 'u2',
      name: 'Trần Thị Bình',
      assigned: 15,
      responded: 12,
      under5m: 6,
      avgMin: 12.8,
      won: 3,
      revenue: 9000000,
    },
  ];

  const staff = computeStaffSla(rows);
  assert.equal(staff.length, 2);

  // An: 16/20 = 80% SLA rate
  assert.equal(staff[0].name, 'Nguyễn Văn An');
  assert.equal(staff[0].slaComplianceRate, 80);
  assert.equal(staff[0].avgResponseMinutes, 3.4);
  assert.equal(staff[0].wonDeals, 8);
  assert.equal(staff[0].totalRevenue, 25000000);

  // Bình: 6/15 = 40% SLA rate
  assert.equal(staff[1].name, 'Trần Thị Bình');
  assert.equal(staff[1].slaComplianceRate, 40);
  assert.equal(staff[1].avgResponseMinutes, 12.8);
});
