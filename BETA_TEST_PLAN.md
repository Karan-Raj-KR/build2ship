# Beta Test Plan — Opportunity Workspace

## Goal

Test with 10–15 actual applicants to measure whether the product helps them find and prepare for opportunities.

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Users find opportunities worth saving | ≥ 80% save at least one | Analytics: `first_opportunity_saved` |
| Eligibility explanations are correct | ≥ 90% accuracy on known opportunities | Manual review of 5 reports |
| Drafts reduce work | ≥ 70% say drafts saved time | Post-test survey |
| Users return | ≥ 50% return within 7 days | Analytics: returning users |
| Anyone purchases | Track (no target — unvalidated) | Analytics: `payment_confirmed` |

**Important:** Do not describe revenue or demand as validated before real purchases.

## Test Scenarios

### Scenario 1: First-Time User Journey

1. Sign up with email
2. Complete onboarding (skip optional fields)
3. Browse discover feed
4. Save one opportunity
5. Run eligibility analysis
6. Add a task to the workspace
7. Export context

**Measure:** Time to first save, completeness of profile,是否用户理解 feed scope

### Scenario 2: Opportunity Import

1. Find a real opportunity URL (e.g., a hackathon page)
2. Import via URL
3. Review extracted requirements
4. Correct any errors
5. Save to workspace

**Measure:** Extraction accuracy, user corrections needed

### Scenario 3: Application Preparation

1. Open a saved opportunity in workspace
2. Add application questions
3. Draft answers
4. Complete tasks
5. Update application stage
6. Export opportunity-specific context

**Measure:** Draft usefulness, task completion rate

### Scenario 4: Profile Update → Stale Analysis

1. Run eligibility analysis on an opportunity
2. Update profile (e.g., change nationality)
3. Observe stale analysis indicator
4. Re-run analysis

**Measure:** Whether users understand staleness, re-analysis rate

### Scenario 5: Payment Flow (if enabled)

1. View billing page
2. Attempt to use AI feature beyond free limit
3. See upgrade prompt
4. Complete checkout (test mode)
5. Verify increased allowance

**Measure:** Checkout completion rate, understanding of pricing

## Recruitment

- Reach out to university CS/EE clubs
- Post in student hackathon communities
- Personal network of 10–15 students actively applying

## Post-Test Survey (5 questions)

1. Did you find opportunities worth saving? (1-5)
2. Were the eligibility explanations accurate and understandable? (1-5)
3. Did the draft answers save you time? (1-5)
4. What was confusing or broken? (open)
5. Would you use this regularly? (yes/no + why)

## Timeline

- Week 1: Recruit testers, set up production environment
- Week 2: Onboard testers, collect initial feedback
- Week 3: Collect usage data, run survey
- Week 4: Analyze results, prioritize fixes

## Operating Notes

### API Usage Limits

- OpenAI: Monitor at platform.openai.com/usage
- Set billing alerts at $5, $10, $20
- Free tier: 5 analyses + 5 drafts per user per month

### Database Backups

- Supabase: automatic daily backups (7-day retention on free tier)
- Manual backup: `pg_dump` or Supabase Dashboard → Backups

### Emergency Controls

- **Disable AI:** Remove `OPENAI_API_KEY` env var
- **Disable checkout:** Set `ENABLE_CHECKOUT=false`
- **Disable signup:** Add middleware check on `/signup` route
- **Take site down:** Remove from Vercel or set `NEXT_PUBLIC_SUPABASE_URL` to invalid value

### Updating Stale Opportunities

1. Go to `/admin`
2. Review imported opportunities
3. Unpublish stale ones
4. Import updated versions from source URLs

### Known Limitations

- Demo mode resets on page refresh
- No real-time notifications
- No mobile app
- No team collaboration
- AI extraction requires API key for best results
- Age eligibility requires birth date (not supported — uses band only)
- Team size requirements need manual input
