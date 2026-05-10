-- V5__DropSocialPostsStatusCheck.sql
-- Drop outdated check constraint on social_posts table to allow new enum values

ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;
