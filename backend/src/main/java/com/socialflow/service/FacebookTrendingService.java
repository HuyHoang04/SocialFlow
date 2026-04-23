package com.socialflow.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.socialflow.model.TrendingData;
import com.socialflow.repository.TrendingDataRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.UUID;

@Service
@Slf4j
public class FacebookTrendingService {

    private final TrendingDataRepository trendingDataRepository;
    private final RestTemplate restTemplate;
    private static final String FACEBOOK_API_URL = "https://facebook-scraper3.p.rapidapi.com/search/global";
    private static final String SOURCE = "facebook";

    @Value("${app.rapidapi-key}")
    private String rapidApiKey;

    @Value("${app.rapidapi-host-facebook}")
    private String rapidApiHost;

    public FacebookTrendingService(TrendingDataRepository trendingDataRepository,
                                   RestTemplate restTemplate) {
        this.trendingDataRepository = trendingDataRepository;
        this.restTemplate = restTemplate;
    }

    /**
     * Get Facebook trending from cache (database)
     */
    public List<Map<String, Object>> getFacebookTrendingFromCache(UUID brandId, String geo, String keyword) {
        try {
            Optional<TrendingData> data = trendingDataRepository
                    .findFirstByBrandIdAndGeoAndSourceAndSearchKeywordOrderByFetchedAtDesc(brandId, geo, SOURCE, keyword);
            
            if (data.isPresent()) {
                String jsonString = data.get().getTrendingSearches();
                List<Map<String, Object>> result = parseFacebookPostsArray(jsonString);
                log.info("Retrieved {} Facebook posts from cache for brandId={}, geo={}, keyword={}", 
                        result.size(), brandId, geo, keyword);
                return result;
            } else {
                log.info("No cached Facebook data for brandId={}, geo={}, keyword={}", brandId, geo, keyword);
                return new ArrayList<>();
            }
        } catch (Exception ex) {
            log.error("Error retrieving Facebook from cache: {}", ex.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Fetch Facebook trending posts from API and save as JSON
     */
    @Transactional
    public List<Map<String, Object>> getFacebookTrendingFromAPI(UUID brandId, String geo, String keyword) {
        try {
            log.info("Calling Facebook API for brandId={}, geo={}, keyword={}", brandId, geo, keyword);
            
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(7);
            
            String url = UriComponentsBuilder.fromHttpUrl(FACEBOOK_API_URL)
                    .queryParam("query", keyword)
                    .queryParam("location_uid", geo.toLowerCase())
                    .queryParam("start_date", startDate.toString())
                    .queryParam("end_date", endDate.toString())
                    .toUriString();
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-rapidapi-key", rapidApiKey);
            headers.set("x-rapidapi-host", rapidApiHost);
            headers.set("Content-Type", "application/json");
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error("Facebook API returned status: {}", response.getStatusCode());
                return new ArrayList<>();
            }
            
            JsonObject results = JsonParser.parseString(response.getBody()).getAsJsonObject();
            
            if (results.has("error")) {
                log.error("Facebook API error: {}", results.get("error").getAsString());
                return new ArrayList<>();
            }
            
            if (results.has("data")) {
                JsonArray postsArray = results.getAsJsonArray("data");
                String jsonString = postsArray.toString();
                
                // Delete old data for this brandId/geo/source/keyword
                trendingDataRepository.deleteByBrandIdAndGeoAndSourceAndSearchKeyword(brandId, geo, SOURCE, keyword);
                
                // Save new data - reuse trending_data table
                TrendingData entity = TrendingData.builder()
                        .brandId(brandId)
                        .geo(geo)
                        .source(SOURCE)
                        .searchKeyword(keyword)
                        .trendingSearches(jsonString)  // Same column name
                        .fetchedAt(LocalDateTime.now())
                        .build();
                
                trendingDataRepository.save(entity);
                log.info("Saved {} Facebook posts to database for brandId={}, geo={}, keyword={}", 
                        postsArray.size(), brandId, geo, keyword);
                
                return parseFacebookPostsArray(jsonString);
            }
            
            return new ArrayList<>();
            
        } catch (Exception ex) {
            log.error("Exception fetching Facebook trending: {}", ex.getMessage(), ex);
            return new ArrayList<>();
        }
    }

    /**
     * Parse Facebook posts JSON array
     */
    public List<Map<String, Object>> parseFacebookPostsArray(String jsonString) {
        List<Map<String, Object>> postsList = new ArrayList<>();
        
        try {
            JsonArray array = JsonParser.parseString(jsonString).getAsJsonArray();
            
            for (int i = 0; i < array.size(); i++) {
                JsonObject post = array.get(i).getAsJsonObject();
                Map<String, Object> postMap = new HashMap<>();
                
                if (post.has("title")) postMap.put("title", post.get("title").getAsString());
                if (post.has("text")) postMap.put("text", post.get("text").getAsString());
                if (post.has("image")) postMap.put("image", post.get("image").getAsString());
                if (post.has("link")) postMap.put("link", post.get("link").getAsString());
                if (post.has("likes")) postMap.put("likes", post.get("likes").getAsString());
                if (post.has("comments")) postMap.put("comments", post.get("comments").getAsString());
                if (post.has("shares")) postMap.put("shares", post.get("shares").getAsString());
                if (post.has("video")) {
                    postMap.put("is_short", true);
                    postMap.put("video", post.get("video").getAsString());
                } else {
                    postMap.put("is_short", false);
                }
                if (post.has("posted_date")) postMap.put("posted_date", post.get("posted_date").getAsString());
                
                postsList.add(postMap);
            }
        } catch (Exception ex) {
            log.error("Error parsing Facebook posts: {}", ex.getMessage());
        }
        
        return postsList;
    }

    /**
     * Cleanup old data older than 7 days
     */
    @Transactional
    public void cleanupOldData() {
        try {
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            long deleted = trendingDataRepository.deleteByFetchedAtBefore(sevenDaysAgo);
            log.info("Cleaned up {} old trending records", deleted);
        } catch (Exception ex) {
            log.error("Error cleaning up data: {}", ex.getMessage());
        }
    }
}
