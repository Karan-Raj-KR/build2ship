-- Current Supabase projects no longer automatically grant Data API table access.
-- RLS remains the authorization boundary for each operation on owner-scoped tables.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on
  profiles, profile_evidence, applications, application_tasks, application_answers,
  analysis_records, opportunities, opportunity_collections, opportunity_collection_items,
  workspace_preferences, workspace_milestones, profile_insights, scout_runs,
  saved_searches, recommendation_feedback, user_notifications, notification_preferences,
  push_subscriptions, ai_usage, analytics_events, quality_reports
  to authenticated;
grant select on imported_opportunities, payment_passes, payment_orders, progress_rewards to authenticated;
revoke insert, update, delete on payment_passes, payment_orders, progress_rewards from authenticated;
grant all on all tables in schema public to service_role;
