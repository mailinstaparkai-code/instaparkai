-- Valet Phase B: slab-based tariff pricing (PRD: "first hour ₹20, next hour ₹40").
-- Tiers are stored as jsonb: [{ "upto_minutes": 60, "rate": 20 }, { "upto_minutes": null, "rate": 40 }]
-- meaning the last tier (upto_minutes: null) is the rate applied to any remaining duration.

alter type public.tariff_pricing_type add value 'slab';

alter table public.tariff_rules
  add column slab_tiers jsonb;
