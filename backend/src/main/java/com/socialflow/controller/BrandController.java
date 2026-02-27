package com.socialflow.controller;

import com.socialflow.dto.CreateBrandRequest;
import com.socialflow.model.Brand;
import com.socialflow.model.User;
import com.socialflow.service.BrandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getBrands(@AuthenticationPrincipal User user) {
        List<Brand> brands = brandService.getBrandsByUser(user);
        return ResponseEntity.ok(brands.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createBrand(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateBrandRequest request) {
        Brand brand = brandService.createBrand(user, request);
        return ResponseEntity.ok(toMap(brand));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBrand(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        brandService.deleteBrand(id, user);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toMap(Brand brand) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", brand.getId());
        map.put("name", brand.getName());
        map.put("description", brand.getDescription());
        map.put("logoUrl", brand.getLogoUrl());
        map.put("createdAt", brand.getCreatedAt());
        map.put("connectionCount", brand.getConnections().size());
        return map;
    }
}
