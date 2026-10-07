-- ============================================================
-- DEMO DATA — clearly fictional, not live verified listings
-- Run with: supabase db seed --db-url <url>
-- All records have is_demo = true
-- ============================================================

insert into opportunities (
  title, organizer, category, summary, source_url,
  location, participation_mode, funding_description, funding_kind,
  deadline, timezone_known, source_status, status, is_demo, updated_at
) values
(
  '[DEMO] Aurora Fellowship 2025',
  'Northern Lights Foundation (fictional)',
  'fellowship',
  'A fictional 10-week fellowship for undergraduates interested in climate policy. This is demo data — not a real listing.',
  'https://example.com/aurora-fellowship',
  'Helsinki, Finland',
  'in-person',
  'Stipend: €2,000/month. Travel and accommodation covered. No participation cost.',
  'stipend',
  now() + interval '45 days',
  true,
  'live',
  'published',
  true,
  now()
),
(
  '[DEMO] Global Hackathon 2025',
  'OpenTech Initiative (fictional)',
  'hackathon',
  'A fictional 48-hour virtual hackathon for teams of 2–5 building open-source tools. This is demo data — not a real listing.',
  'https://example.com/global-hackathon',
  'Fully Remote',
  'remote',
  'Prize pool: $50,000 total (1st place $20,000, 2nd $10,000, 3rd $5,000). No entry fee.',
  'prize',
  now() + interval '22 days',
  true,
  'live',
  'published',
  true,
  now()
),
(
  '[DEMO] Emerging Scholars Scholarship',
  'University Trust Fund (fictional)',
  'scholarship',
  'A fictional needs-based scholarship for first-generation university students. This is demo data — not a real listing.',
  'https://example.com/emerging-scholars',
  'United Kingdom',
  'in-person',
  'Award: £5,000 per academic year. No travel required for application.',
  'stipend',
  now() + interval '60 days',
  true,
  'live',
  'published',
  true,
  now()
),
(
  '[DEMO] Startup Internship — Product Track',
  'Fictional Ventures Ltd. (fictional)',
  'internship',
  'A fictional 12-week paid internship for students interested in product management at early-stage startups. This is demo data — not a real listing.',
  'https://example.com/startup-internship',
  'San Francisco, CA, USA or Remote',
  'hybrid',
  'Stipend: $6,000/month. Fully remote option available.',
  'stipend',
  now() + interval '30 days',
  true,
  'live',
  'published',
  true,
  now()
),
(
  '[DEMO] Community Innovation Grant',
  'Local Futures Foundation (fictional)',
  'grant',
  'A fictional grant for student-led community projects. Maximum award $2,500. This is demo data — not a real listing.',
  'https://example.com/community-grant',
  'United States',
  'in-person',
  'Grant: up to $2,500. No participation cost. Recipients must provide a brief report at project conclusion.',
  'prize',
  now() - interval '5 days',
  true,
  'closed',
  'published',
  true,
  now()
);
