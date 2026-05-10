package com.socialflow.model.enums;

public enum PostStatus {
    DRAFT,                  // Initial state or rejected, ready to edit
    PENDING_APPROVAL,       // Creator submitted for approval, waiting for reviewer
    APPROVED,               // All required approvals done, ready to publish/schedule
    REJECTED,               // Rejected by reviewer, back to editable DRAFT state
    SCHEDULED,              // Approved and scheduled for future time
    PUBLISHING,             // In progress - publishing to social networks
    PUBLISHED,              // Successfully published
    FAILED                  // Publishing failed
}
