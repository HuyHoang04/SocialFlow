package com.socialflow.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.socialflow.model.TrendingData;
import com.socialflow.repository.TrendingDataRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service to fetch Google Trends data via SerpAPI
 * Saves full trending_searches JSON array to database (1 row = 130 trends)
 */
@Service
@Slf4j
public class TrendingService {

    private final TrendingDataRepository trendingDataRepository;
    private final RestTemplate restTemplate;
    private static final String SERPAPI_URL = "https://serpapi.com/search";

    @Value("${app.serpapi-key:012a8083caee2069aaf362b74d6e68f76930c95f3544132dedb91a1254f9336f}")
    private String serpApiKey;

    public TrendingService(TrendingDataRepository trendingDataRepository, RestTemplate restTemplate) {
        this.trendingDataRepository = trendingDataRepository;
        this.restTemplate = restTemplate;
    }

    /**
     * Get trending searches from cache (database)
     */
    public List<Map<String, Object>> getTrendingFromCache(UUID brandId, String geo, String categoryId) {
        try {
            Optional<TrendingData> data;
            
            if (categoryId != null && !categoryId.isEmpty()) {
                data = trendingDataRepository.findFirstByBrandIdAndGeoAndSourceAndCategoryIdOrderByFetchedAtDesc(
                        brandId, geo, "google", categoryId);
            } else {
                data = trendingDataRepository.findFirstByBrandIdAndGeoAndSourceAndCategoryIdIsNullOrderByFetchedAtDesc(
                        brandId, geo, "google");
            }
            
            if (data.isPresent()) {
                String jsonString = data.get().getTrendingSearches();
                List<Map<String, Object>> result = parseTrendingArray(jsonString);
                log.info("Retrieved {} trending items from cache for brandId={}, geo={}, categoryId={}", 
                        result.size(), brandId, geo, categoryId);
                return result;
            } else {
                log.info("No cached trending data for brandId={}, geo={}, categoryId={}", brandId, geo, categoryId);
                return new ArrayList<>();
            }
                    
        } catch (Exception ex) {
            log.error("Error retrieving trending from cache: {}", ex.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Get trending searches from Google Trends API and save full JSON array to database
     */
    @Transactional
    public List<Map<String, Object>> getTrendingFromAPI(UUID brandId, String geo, String categoryId) {
        try {
            log.info("Calling SerpAPI for brandId={}, geo={}, categoryId={}", brandId, geo, categoryId);
            
            // Build URL with query parameters
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(SERPAPI_URL)
                    .queryParam("engine", "google_trends_trending_now")
                    .queryParam("geo", geo)
                    .queryParam("api_key", serpApiKey);
            
            if (categoryId != null && !categoryId.isEmpty()) {
                builder.queryParam("category_id", categoryId);
            }
            
            String url = builder.toUriString();
            log.debug("SerpAPI URL: {}", url.replaceAll("api_key=.*", "api_key=***"));
            
            // Make HTTP request
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error("SerpAPI returned status: {}", response.getStatusCode());
                return new ArrayList<>();
            }
            
            // Parse JSON response
            JsonObject results = JsonParser.parseString(response.getBody()).getAsJsonObject();
            
            // Check for errors in response
            if (results.has("error")) {
                log.error("SerpAPI error: {}", results.get("error").getAsString());
                return new ArrayList<>();
            }
            
            // Extract trending_searches array and save raw JSON
            if (results.has("trending_searches")) {
                JsonArray trendingArray = results.getAsJsonArray("trending_searches");
                String jsonString = trendingArray.toString();
                
                // Delete old data for this brand/geo/category
                if (categoryId != null && !categoryId.isEmpty()) {
                    trendingDataRepository.deleteByBrandIdAndGeoAndSourceAndCategoryId(brandId, geo, "google", categoryId);
                } else {
                    trendingDataRepository.deleteByBrandIdAndGeoAndSourceAndCategoryIdIsNull(brandId, geo, "google");
                }
                
                // Save new data - 1 row with full JSON array
                TrendingData entity = TrendingData.builder()
                        .brandId(brandId)
                        .geo(geo)
                        .source("google")
                        .categoryId(categoryId)
                        .trendingSearches(jsonString)
                        .fetchedAt(LocalDateTime.now())
                        .build();
                
                trendingDataRepository.save(entity);
                log.info("Saved trending data to database for brandId={}, geo={}, categoryId={}, items={}", 
                        brandId, geo, categoryId, trendingArray.size());
                
                // Parse and return
                return parseTrendingArray(jsonString);
            }
            
            return new ArrayList<>();
            
        } catch (Exception ex) {
            log.error("Exception fetching trending: {}", ex.getMessage(), ex);
            return new ArrayList<>();
        }
    }

    /**
     * Parse trending_searches JSON array to list of maps
     */
    public List<Map<String, Object>> parseTrendingArray(String jsonString) {
        List<Map<String, Object>> searchesList = new ArrayList<>();
        
        try {
            JsonArray array = JsonParser.parseString(jsonString).getAsJsonArray();
            
            for (int i = 0; i < array.size(); i++) {
                JsonObject item = array.get(i).getAsJsonObject();
                Map<String, Object> trend = new HashMap<>();
                
                // Extract data
                if (item.has("query")) {
                    trend.put("query", item.get("query").getAsString());
                }
                if (item.has("traffic")) {
                    trend.put("traffic", item.get("traffic").getAsString());
                }
                if (item.has("news")) {
                    // Keep news as JSON array string for FE to parse
                    trend.put("news", item.get("news").getAsJsonArray().toString());
                }
                if (item.has("link")) {
                    trend.put("link", item.get("link").getAsString());
                }
                if (item.has("image")) {
                    trend.put("image", item.get("image").getAsString());
                }
                
                searchesList.add(trend);
            }
        } catch (Exception ex) {
            log.error("Error parsing trending array: {}", ex.getMessage());
        }
        
        return searchesList;
    }

    /**
     * Cleanup old trending data (older than 7 days)
     */
    @Transactional
    public void cleanupOldData() {
        try {
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            long deleted = trendingDataRepository.deleteByFetchedAtBefore(sevenDaysAgo);
            log.info("Cleaned up {} old trending records", deleted);
        } catch (Exception ex) {
            log.error("Error cleaning up old trending data: {}", ex.getMessage());
        }
    }
}
