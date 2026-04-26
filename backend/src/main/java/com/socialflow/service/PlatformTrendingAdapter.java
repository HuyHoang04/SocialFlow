package com.socialflow.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface PlatformTrendingAdapter {
    String getSource();
    List<Map<String, Object>> getTrendingFromCache(UUID brandId, String geo, String keywordOrCategoryId);
    List<Map<String, Object>> getTrendingFromAPI(UUID brandId, String geo, String keywordOrCategoryId);
}
