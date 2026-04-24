package com.socialflow.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.socialflow.model.TrendingData;
import com.socialflow.repository.TrendingDataRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
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
            headers.set("Accept", "application/json");

            // ⚠️ Must use exchange() — getForEntity() doesn't accept custom headers
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            String body = response.getBody();

            // ── Debug: log truncated raw response to see the actual structure ──────
            log.info("Facebook API raw response (first 500 chars): {}",
                    body != null && body.length() > 500 ? body.substring(0, 500) + "..." : body);

            // The root element can be an object or a plain array depending on API version
            com.google.gson.JsonElement root = JsonParser.parseString(body);

            JsonArray postsArray = null;

            if (root.isJsonArray()) {
                // Root is directly an array
                postsArray = root.getAsJsonArray();
                log.info("Facebook API returned a root-level JSON array, size={}", postsArray.size());

            } else if (root.isJsonObject()) {
                JsonObject results = root.getAsJsonObject();

                if (results.has("error")) {
                    log.error("Facebook API error: {}", results.get("error").getAsString());
                    return new ArrayList<>();
                }

                // Try common field names used by various RapidAPI Facebook scrapers
                for (String field : new String[]{"data", "results", "posts", "items", "feeds"}) {
                    if (results.has(field) && results.get(field).isJsonArray()) {
                        postsArray = results.getAsJsonArray(field);
                        log.info("Facebook API: found posts under field='{}', size={}", field, postsArray.size());
                        break;
                    }
                }

                if (postsArray == null) {
                    log.warn("Facebook API: no known array field found. Top-level keys: {}", results.keySet());
                }
            }

            if (postsArray != null && postsArray.size() > 0) {
                String jsonString = postsArray.toString();

                trendingDataRepository.deleteByBrandIdAndGeoAndSourceAndSearchKeyword(brandId, geo, SOURCE, keyword);

                TrendingData trendingData = TrendingData.builder()
                        .brandId(brandId)
                        .geo(geo)
                        .source(SOURCE)
                        .searchKeyword(keyword)
                        .trendingSearches(jsonString)
                        .fetchedAt(LocalDateTime.now())
                        .build();

                trendingDataRepository.save(trendingData);
                log.info("Saved {} Facebook posts for brandId={}, geo={}, keyword={}",
                        postsArray.size(), brandId, geo, keyword);

                return parseFacebookPostsArray(jsonString);
            }

            log.warn("Facebook API returned no posts for brandId={}, geo={}, keyword={}", brandId, geo, keyword);
            return new ArrayList<>();

            
        } catch (Exception ex) {
            log.error("Exception fetching Facebook trending: {}", ex.getMessage(), ex);
            return new ArrayList<>();
        }
    }

    /**
     * Parse Facebook posts JSON array using the actual API schema:
     *   message, url, reactions_count, comments_count, reshare_count,
     *   image (object with .uri), author (object with .name), timestamp, album_preview
     */
    public List<Map<String, Object>> parseFacebookPostsArray(String jsonString) {
        List<Map<String, Object>> postsList = new ArrayList<>();

        try {
            JsonArray array = JsonParser.parseString(jsonString).getAsJsonArray();

            for (int i = 0; i < array.size(); i++) {
                JsonObject post = array.get(i).getAsJsonObject();
                Map<String, Object> postMap = new HashMap<>();

                // ── Core text ────────────────────────────────────────────────
                String message = safeStr(post, "message");
                postMap.put("query", message);   // used by copy button
                postMap.put("text",  message);   // used by FE display
                postMap.put("link",  safeStr(post, "url"));

                // ── Image: can be null OR {"uri": "...", "height":…, "width":…} ──
                String imageUrl = extractImageUri(post);
                if (!imageUrl.isEmpty()) postMap.put("image", imageUrl);

                // ── Engagement (integer fields) ───────────────────────────────
                postMap.put("likes",    safeInt(post, "reactions_count"));
                postMap.put("comments", safeInt(post, "comments_count"));
                postMap.put("shares",   safeInt(post, "reshare_count"));

                // ── Author ────────────────────────────────────────────────────
                if (post.has("author") && !post.get("author").isJsonNull()
                        && post.get("author").isJsonObject()) {
                    JsonObject author = post.getAsJsonObject("author");
                    postMap.put("author_name",    safeStr(author, "name"));
                    postMap.put("author_url",     safeStr(author, "url"));
                    postMap.put("author_picture", safeStr(author, "profile_picture_url"));
                }

                // ── Timestamp → human-readable ────────────────────────────────
                if (post.has("timestamp") && !post.get("timestamp").isJsonNull()) {
                    long epochSec = post.get("timestamp").getAsLong();
                    postMap.put("posted_date",
                            java.time.Instant.ofEpochSecond(epochSec)
                                    .atZone(java.time.ZoneOffset.UTC)
                                    .toLocalDate().toString());
                }

                // ── Video flag ────────────────────────────────────────────────
                boolean hasVideo = post.has("video") && !post.get("video").isJsonNull();
                postMap.put("is_short", hasVideo);

                postsList.add(postMap);
            }

        } catch (Exception ex) {
            log.error("Error parsing Facebook posts: {}", ex.getMessage(), ex);
        }

        return postsList;
    }

    /** Safely extract a string field — returns "" for missing/null/non-primitive fields. */
    private String safeStr(JsonObject obj, String field) {
        if (!obj.has(field)) return "";
        JsonElement el = obj.get(field);
        if (el.isJsonNull()) return "";
        if (el.isJsonPrimitive()) return el.getAsString();
        return ""; // object/array — don't stringify
    }

    /** Safely extract an int field — returns 0 for missing/null. */
    private int safeInt(JsonObject obj, String field) {
        if (!obj.has(field)) return 0;
        JsonElement el = obj.get(field);
        if (el.isJsonNull() || !el.isJsonPrimitive()) return 0;
        try { return el.getAsInt(); } catch (Exception e) { return 0; }
    }

    /**
     * Extract an image URL from the post.
     * Priority: image.uri (direct image object) → album_preview[0].image_file_uri → ""
     */
    private String extractImageUri(JsonObject post) {
        // Direct image field (can be null or an object {uri, height, width, id})
        if (post.has("image") && !post.get("image").isJsonNull()
                && post.get("image").isJsonObject()) {
            JsonObject img = post.getAsJsonObject("image");
            String uri = safeStr(img, "uri");
            if (!uri.isEmpty()) return uri;
        }

        // Fallback: first photo in album_preview
        if (post.has("album_preview") && !post.get("album_preview").isJsonNull()
                && post.get("album_preview").isJsonArray()) {
            JsonArray album = post.getAsJsonArray("album_preview");
            if (album.size() > 0 && album.get(0).isJsonObject()) {
                return safeStr(album.get(0).getAsJsonObject(), "image_file_uri");
            }
        }

        return "";
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
