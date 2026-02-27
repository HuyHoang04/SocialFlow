package com.socialflow.controller;

import com.socialflow.model.SocialConnection;
import com.socialflow.model.SocialPage;
import com.socialflow.service.OAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class ConnectionController {

    private final OAuthService oauthService;

    @GetMapping("/api/brands/{brandId}/connections")
    public ResponseEntity<List<Map<String, Object>>> getConnections(@PathVariable UUID brandId) {
        List<SocialConnection> connections = oauthService.getConnectionsByBrand(brandId);
        return ResponseEntity.ok(connections.stream().map(this::connToMap).collect(Collectors.toList()));
    }

    @GetMapping("/api/connections/{connId}/pages")
    public ResponseEntity<List<Map<String, Object>>> getPages(@PathVariable UUID connId) {
        List<SocialPage> pages = oauthService.getPagesByConnection(connId);
        return ResponseEntity.ok(pages.stream().map(this::pageToMap).collect(Collectors.toList()));
    }

    @DeleteMapping("/api/connections/{id}")
    public ResponseEntity<Void> deleteConnection(@PathVariable UUID id) {
        oauthService.deleteConnection(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/brands/{brandId}/pages")
    public ResponseEntity<List<Map<String, Object>>> getAllPagesForBrand(@PathVariable UUID brandId) {
        List<SocialConnection> connections = oauthService.getConnectionsByBrand(brandId);
        List<Map<String, Object>> allPages = new ArrayList<>();
        for (SocialConnection conn : connections) {
            List<SocialPage> pages = oauthService.getPagesByConnection(conn.getId());
            for (SocialPage page : pages) {
                Map<String, Object> map = pageToMap(page);
                map.put("connectionName", conn.getAccountName());
                allPages.add(map);
            }
        }
        return ResponseEntity.ok(allPages);
    }

    private Map<String, Object> connToMap(SocialConnection conn) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", conn.getId());
        map.put("platform", conn.getPlatform());
        map.put("accountName", conn.getAccountName());
        map.put("accountId", conn.getAccountId());
        map.put("createdAt", conn.getCreatedAt());
        map.put("pageCount", conn.getPages().size());
        return map;
    }

    private Map<String, Object> pageToMap(SocialPage page) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", page.getId());
        map.put("platformPageId", page.getPlatformPageId());
        map.put("pageName", page.getPageName());
        map.put("platform", page.getPlatform());
        return map;
    }
}
