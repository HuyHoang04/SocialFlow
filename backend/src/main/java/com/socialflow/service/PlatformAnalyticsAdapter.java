package com.socialflow.service;

import com.socialflow.model.enums.PlatformType;

import java.util.UUID;

public interface PlatformAnalyticsAdapter {
    PlatformType getPlatformType();
    
    /** Sync post analytics from platform to our DB */
    void syncPostAnalytics(UUID brandId);
    
    /** Sync page/profile analytics from platform to our DB */
    void syncPageAnalytics(UUID brandId);
}
