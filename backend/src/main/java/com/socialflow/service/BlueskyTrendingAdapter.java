package com.socialflow.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.socialflow.model.TrendingData;
import com.socialflow.model.SocialConnection;
import com.socialflow.model.SocialPage;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.repository.SocialConnectionRepository;
import com.socialflow.repository.SocialPageRepository;
import com.socialflow.repository.TrendingDataRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
public class BlueskyTrendingAdapter implements PlatformTrendingAdapter {

    private final TrendingDataRepository trendingDataRepository;
    private final RestTemplate restTemplate;
    private final SocialConnectionRepository socialConnectionRepository;
    private final SocialPageRepository socialPageRepository;

    private static final String BLUESKY_TRENDING_URL = "https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrendingTopics";
    private static final String BLUESKY_PROFILE_URL = "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=";
    private static final String BLUESKY_FEED_URL = "https://public.api.bsky.app/xrpc/app.bsky.feed.getFeed?feed=";
    private static final String SOURCE = "bluesky";

    private final Map<String, String> handleToDidCache = new HashMap<>();

    public BlueskyTrendingAdapter(TrendingDataRepository trendingDataRepository, RestTemplate restTemplate,
                                  SocialConnectionRepository socialConnectionRepository, SocialPageRepository socialPageRepository) {
        this.trendingDataRepository = trendingDataRepository;
        this.restTemplate = restTemplate;
        this.socialConnectionRepository = socialConnectionRepository;
        this.socialPageRepository = socialPageRepository;
    }

    @Override
    public String getSource() {
        return SOURCE;
    }

    @Override
    public List<Map<String, Object>> getTrendingFromCache(UUID brandId, String geo, String keywordOrCategoryId) {
        try {
            Optional<TrendingData> data = trendingDataRepository
                    .findFirstByBrandIdAndGeoAndSourceAndSearchKeywordOrderByFetchedAtDesc(brandId, geo, SOURCE, keywordOrCategoryId);
            
            if (data.isPresent()) {
                String jsonString = data.get().getTrendingSearches();
                List<Map<String, Object>> result = parseBlueskyTrendsArray(jsonString);
                log.info("Retrieved {} Bluesky trends from cache for brandId={}", result.size(), brandId);
                return result;
            } else {
                return new ArrayList<>();
            }
        } catch (Exception ex) {
            log.error("Error retrieving Bluesky from cache: {}", ex.getMessage());
            return new ArrayList<>();
        }
    }

    @Transactional
    @Override
    public List<Map<String, Object>> getTrendingFromAPI(UUID brandId, String geo, String keywordOrCategoryId) {
        try {
            log.info("Calling Bluesky API for brandId={}", brandId);
            
            String accessJwt = getAccessJwt(brandId);
            HttpHeaders headers = new HttpHeaders();
            if (accessJwt != null) {
                headers.setBearerAuth(accessJwt);
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(BLUESKY_TRENDING_URL, HttpMethod.GET, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error("Bluesky API returned status: {}", response.getStatusCode());
                return new ArrayList<>();
            }

            JsonObject results = JsonParser.parseString(response.getBody()).getAsJsonObject();
            if (results.has("error")) {
                log.error("Bluesky API error: {}", results.get("error").getAsString());
                return new ArrayList<>();
            }

            JsonArray finalTrends = new JsonArray();
            Set<String> seenTopicLinks = new HashSet<>();

            // Process topics and suggested
            if (results.has("topics") && results.get("topics").isJsonArray()) {
                JsonArray topicsArray = results.getAsJsonArray("topics");
                for (int i = 0; i < topicsArray.size() && finalTrends.size() < 10; i++) {
                    JsonObject topicObj = topicsArray.get(i).getAsJsonObject();
                    String link = safeStr(topicObj, "link");
                    if (!link.isEmpty() && !seenTopicLinks.contains(link)) {
                        enrichTopicWithPost(topicObj, entity);
                        finalTrends.add(topicObj);
                        seenTopicLinks.add(link);
                    }
                }
            }
            
            if (results.has("suggested") && results.get("suggested").isJsonArray()) {
                JsonArray suggestedArray = results.getAsJsonArray("suggested");
                for (int i = 0; i < suggestedArray.size() && finalTrends.size() < 15; i++) {
                    JsonObject topicObj = suggestedArray.get(i).getAsJsonObject();
                    String link = safeStr(topicObj, "link");
                    if (!link.isEmpty() && !seenTopicLinks.contains(link)) {
                        topicObj.addProperty("category", "Suggested");
                        enrichTopicWithPost(topicObj, entity);
                        finalTrends.add(topicObj);
                        seenTopicLinks.add(link);
                        log.info("Suggested trend added: {}", topicObj.get("topic"));
                    }
                }
            }

            if (finalTrends.size() > 0) {
                String jsonString = finalTrends.toString();

                trendingDataRepository.deleteByBrandIdAndGeoAndSourceAndSearchKeyword(brandId, geo, SOURCE, keywordOrCategoryId);

                TrendingData trendingData = TrendingData.builder()
                        .brandId(brandId)
                        .geo(geo)
                        .source(SOURCE)
                        .searchKeyword(keywordOrCategoryId)
                        .trendingSearches(jsonString)
                        .fetchedAt(LocalDateTime.now())
                        .build();

                trendingDataRepository.save(trendingData);

                return parseBlueskyTrendsArray(jsonString);
            }

            return new ArrayList<>();
        } catch (Exception ex) {
            log.error("Exception fetching Bluesky trending: {}", ex.getMessage(), ex);
            return new ArrayList<>();
        }
    }

    private void enrichTopicWithPost(JsonObject topicObj, HttpEntity<String> entity) {
        String link = safeStr(topicObj, "link");
        if (link.isEmpty()) return;
        
        try {
            // link format: /profile/trending.bsky.app/feed/697251438
            String[] parts = link.split("/");
            if (parts.length >= 5 && "profile".equals(parts[1]) && "feed".equals(parts[3])) {
                String handle = parts[2];
                String rkey = parts[4];

                String did = getDidForHandle(handle);
                if (did != null) {
                    String feedUri = "at://" + did + "/app.bsky.feed.generator/" + rkey;
                    
                    String baseUrl = "https://public.api.bsky.app/xrpc/app.bsky.feed.getFeed";
                    if (entity.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                        baseUrl = "https://bsky.social/xrpc/app.bsky.feed.getFeed";
                    }

                    java.net.URI uri = org.springframework.web.util.UriComponentsBuilder
                            .fromHttpUrl(baseUrl)
                            .queryParam("feed", feedUri)
                            .queryParam("limit", 15) // Fetch more to allow for better deduplication
                            .build()
                            .toUri();
                    
                    ResponseEntity<String> feedResp = restTemplate.exchange(uri, HttpMethod.GET, entity, String.class);
                    if (feedResp.getStatusCode().is2xxSuccessful() && feedResp.getBody() != null) {
                        JsonObject feedData = JsonParser.parseString(feedResp.getBody()).getAsJsonObject();
                        if (feedData.has("feed") && feedData.get("feed").isJsonArray()) {
                            JsonArray feedArray = feedData.getAsJsonArray("feed");
                            JsonArray postsArray = new JsonArray();
                            Set<String> seenPostUris = new HashSet<>();
                            Set<String> seenAuthors = new HashSet<>();
                            
                            // First pass: try to get posts from unique authors
                            for (int i = 0; i < feedArray.size() && postsArray.size() < 3; i++) {
                                JsonObject feedItem = feedArray.get(i).getAsJsonObject();
                                if (feedItem.has("post")) {
                                    JsonObject postObj = feedItem.getAsJsonObject("post");
                                    String postUri = safeStr(postObj, "uri");
                                    String authorDid = "";
                                    if (postObj.has("author")) {
                                        authorDid = safeStr(postObj.getAsJsonObject("author"), "did");
                                    }
                                    
                                    if (!postUri.isEmpty() && !seenPostUris.contains(postUri) && !authorDid.isEmpty() && !seenAuthors.contains(authorDid)) {
                                        postsArray.add(postObj);
                                        seenPostUris.add(postUri);
                                        seenAuthors.add(authorDid);
                                    }
                                }
                            }
                            
                            // Second pass: if we still don't have 3 posts, allow same authors but different posts
                            if (postsArray.size() < 3) {
                                for (int i = 0; i < feedArray.size() && postsArray.size() < 3; i++) {
                                    JsonObject feedItem = feedArray.get(i).getAsJsonObject();
                                    if (feedItem.has("post")) {
                                        JsonObject postObj = feedItem.getAsJsonObject("post");
                                        String postUri = safeStr(postObj, "uri");
                                        if (!postUri.isEmpty() && !seenPostUris.contains(postUri)) {
                                            postsArray.add(postObj);
                                            seenPostUris.add(postUri);
                                        }
                                    }
                                }
                            }

                            if (postsArray.size() > 0) {
                                topicObj.add("posts", postsArray);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch post for topic link '{}': {}", link, e.getMessage());
        }
    }

    private String getDidForHandle(String handle) {
        if (handleToDidCache.containsKey(handle)) {
            return handleToDidCache.get(handle);
        }
        try {
            java.net.URI uri = org.springframework.web.util.UriComponentsBuilder
                    .fromHttpUrl("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile")
                    .queryParam("actor", handle)
                    .build()
                    .toUri();
                    
            ResponseEntity<String> profileResp = restTemplate.getForEntity(uri, String.class);
            if (profileResp.getStatusCode().is2xxSuccessful() && profileResp.getBody() != null) {
                JsonObject profileData = JsonParser.parseString(profileResp.getBody()).getAsJsonObject();
                if (profileData.has("did")) {
                    String did = profileData.get("did").getAsString();
                    handleToDidCache.put(handle, did);
                    return did;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get profile DID for handle: {}", handle);
        }
        return null;
    }

    private String getAccessJwt(UUID brandId) {
        try {
            List<SocialConnection> connections = socialConnectionRepository.findByBrandId(brandId);
            for (SocialConnection conn : connections) {
                if (conn.getPlatform() == PlatformType.BLUESKY) {
                    List<SocialPage> pages = socialPageRepository.findByConnectionId(conn.getId());
                    if (!pages.isEmpty()) {
                        SocialPage page = pages.get(0);
                        String appPassword = page.getConnection().getRefreshToken();
                        String handle = page.getPageName();

                        Map<String, String> body = Map.of("identifier", handle, "password", appPassword);
                        ResponseEntity<String> sessionResp = restTemplate.postForEntity(
                                "https://bsky.social/xrpc/com.atproto.server.createSession", body, String.class);

                        if (sessionResp.getStatusCode().is2xxSuccessful() && sessionResp.getBody() != null) {
                            JsonObject sessionData = JsonParser.parseString(sessionResp.getBody()).getAsJsonObject();
                            if (sessionData.has("accessJwt")) {
                                return sessionData.get("accessJwt").getAsString();
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to authenticate Bluesky for brandId {}: {}", brandId, e.getMessage());
        }
        return null;
    }

    public List<Map<String, Object>> parseBlueskyTrendsArray(String jsonString) {
        List<Map<String, Object>> trendsList = new ArrayList<>();
        try {
            JsonArray array = JsonParser.parseString(jsonString).getAsJsonArray();
            for (int i = 0; i < array.size(); i++) {
                JsonObject item = array.get(i).getAsJsonObject();
                
                String topic = safeStr(item, "topic");
                String category = safeStr(item, "category").isEmpty() ? "Trending Topic" : safeStr(item, "category");
                String link = safeStr(item, "link");
                if (!link.isEmpty() && link.startsWith("/")) {
                    link = "https://bsky.app" + link;
                }

                if (item.has("posts")) {
                    JsonArray posts = item.getAsJsonArray("posts");
                    for (int j = 0; j < posts.size(); j++) {
                        JsonObject post = posts.get(j).getAsJsonObject();
                        Map<String, Object> trend = new HashMap<>();
                        trend.put("query", topic);
                        trend.put("category", category);
                        trend.put("link", link);

                        extractPostData(post, trend);
                        trendsList.add(trend);
                    }
                } else if (item.has("post")) {
                    JsonObject post = item.getAsJsonObject("post");
                    Map<String, Object> trend = new HashMap<>();
                    trend.put("query", topic);
                    trend.put("category", category);
                    trend.put("link", link);

                    extractPostData(post, trend);
                    trendsList.add(trend);
                } else {
                    Map<String, Object> trend = new HashMap<>();
                    trend.put("query", topic);
                    trend.put("category", category);
                    trend.put("link", link);
                    trend.put("text", topic);
                    trendsList.add(trend);
                }
            }
        } catch (Exception ex) {
            log.error("Error parsing Bluesky trends array: {}", ex.getMessage());
        }
        return trendsList;
    }

    private void extractPostData(JsonObject post, Map<String, Object> trend) {
        if (post.has("record")) {
            JsonObject record = post.getAsJsonObject("record");
            trend.put("text", safeStr(record, "text"));
            if (record.has("createdAt")) {
                try {
                    trend.put("posted_date", java.time.OffsetDateTime.parse(record.get("createdAt").getAsString()).toLocalDate().toString());
                } catch (Exception e) {}
            }
        }
        
        if (post.has("author")) {
            JsonObject author = post.getAsJsonObject("author");
            trend.put("author_name", safeStr(author, "displayName").isEmpty() ? safeStr(author, "handle") : safeStr(author, "displayName"));
            trend.put("author_url", "https://bsky.app/profile/" + safeStr(author, "handle"));
            trend.put("author_picture", safeStr(author, "avatar"));
        }
        
        if (post.has("embed")) {
            JsonObject embed = post.getAsJsonObject("embed");
            if (embed.has("images")) {
                JsonArray images = embed.getAsJsonArray("images");
                if (images.size() > 0) {
                    JsonObject img = images.get(0).getAsJsonObject();
                    if (img.has("thumb")) {
                        trend.put("image", safeStr(img, "thumb"));
                    } else if (img.has("fullsize")) {
                        trend.put("image", safeStr(img, "fullsize"));
                    }
                }
            }
        }

        trend.put("likes", safeInt(post, "likeCount"));
        trend.put("comments", safeInt(post, "replyCount"));
        trend.put("shares", safeInt(post, "repostCount") + safeInt(post, "quoteCount"));
    }

    private String safeStr(JsonObject obj, String field) {
        if (!obj.has(field)) return "";
        JsonElement el = obj.get(field);
        if (el.isJsonNull()) return "";
        if (el.isJsonPrimitive()) return el.getAsString();
        return "";
    }

    private int safeInt(JsonObject obj, String field) {
        if (!obj.has(field)) return 0;
        JsonElement el = obj.get(field);
        if (el.isJsonNull() || !el.isJsonPrimitive()) return 0;
        try { return el.getAsInt(); } catch (Exception e) { return 0; }
    }
}
