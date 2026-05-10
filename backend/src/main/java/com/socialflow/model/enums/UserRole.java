package com.socialflow.model.enums;

public enum UserRole {
    ADMIN,      // Global admin, can manage all brands/users, approve posts
    MANAGER,    // Brand manager, can manage brand settings and approve posts
    CREATOR     // Content creator, can create/edit posts but needs approval to publish
}
