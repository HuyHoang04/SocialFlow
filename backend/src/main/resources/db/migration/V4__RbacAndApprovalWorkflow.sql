-- V4__RbacAndApprovalWorkflow.sql
-- Add RBAC and approval workflow support

-- Update existing NULL values in storage_provider (from old migrations) to 'LOCAL'
UPDATE post_media_assets SET storage_provider = 'LOCAL' WHERE storage_provider IS NULL;

-- Add/update storage_provider column to post_media table (make it NOT NULL)
ALTER TABLE post_media_assets 
  ALTER COLUMN storage_provider SET NOT NULL,
  ALTER COLUMN storage_provider SET DEFAULT 'LOCAL';

-- Create user_role enum type
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'CREATOR');

-- Create brand_team_members table
CREATE TABLE brand_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_brand_team_members_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    CONSTRAINT fk_brand_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_brand_team_members_unique UNIQUE (brand_id, user_id)
);

CREATE INDEX idx_brand_team_members_brand_id ON brand_team_members(brand_id);
CREATE INDEX idx_brand_team_members_user_id ON brand_team_members(user_id);

-- Create approval_workflow_configs table
CREATE TABLE approval_workflow_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    approval_levels INTEGER NOT NULL DEFAULT 1 CHECK (approval_levels IN (1, 2)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_approval_workflow_configs_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX idx_approval_workflow_configs_brand_id ON approval_workflow_configs(brand_id);

-- Create approval_status enum type
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create post_approvals table
CREATE TABLE post_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    assigned_to_id UUID NOT NULL,
    approval_level INTEGER NOT NULL,
    status approval_status NOT NULL DEFAULT 'PENDING',
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    CONSTRAINT fk_post_approvals_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_approvals_assigned_to FOREIGN KEY (assigned_to_id) REFERENCES users(id)
);

CREATE INDEX idx_post_approvals_post_id ON post_approvals(post_id);
CREATE INDEX idx_post_approvals_assigned_to_id ON post_approvals(assigned_to_id);
CREATE INDEX idx_post_approvals_status ON post_approvals(status);

-- Extend post_status enum to include approval states
-- First, rename old enum
ALTER TYPE post_status RENAME TO post_status_old;

-- Create new enum with all states
CREATE TYPE post_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- Update column to use new enum (requires casting)
ALTER TABLE posts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE posts ALTER COLUMN status TYPE post_status USING status::text::post_status;
ALTER TABLE posts ALTER COLUMN status SET DEFAULT 'DRAFT';

-- Clean up old enum
DROP TYPE post_status_old;

-- Create user_invitations table
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    role user_role NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    accepted_by_user_id UUID,
    CONSTRAINT fk_user_invitations_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_invitations_accepted_by FOREIGN KEY (accepted_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_invitations_brand_id ON user_invitations(brand_id);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_accepted_at ON user_invitations(accepted_at);
