package com.socialflow.service;

import com.socialflow.dto.LinktreeProfileRequest;
import com.socialflow.model.*;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.repository.BrandLinktreeProfileRepository;
import com.socialflow.repository.BrandRepository;
import com.socialflow.service.OAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class BrandLinktreeService {

    private final BrandLinktreeProfileRepository profileRepository;
    private final BrandRepository brandRepository;
    private final OAuthService oauthService;
    private final CloudinaryService cloudinaryService;

    // ── Upsert profile for a brand ──────────────────────────────────────────

    @Transactional
    public BrandLinktreeProfile upsert(UUID brandId, LinktreeProfileRequest req) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));

        // Validate slug uniqueness if changed
        if (req.getSlug() != null) {
            if (req.getSlug().isBlank()) {
                req.setSlug(null);
            } else {
                String cleanSlug = req.getSlug().toLowerCase().replaceAll("[^a-z0-9\\-]", "-");
                profileRepository.findBySlug(cleanSlug).ifPresent(existing -> {
                    if (!existing.getBrand().getId().equals(brandId)) {
                        throw new RuntimeException("Slug '" + cleanSlug + "' is already taken");
                    }
                });
                req.setSlug(cleanSlug);
            }
        }

        BrandLinktreeProfile profile = profileRepository.findByBrandId(brandId)
                .orElse(BrandLinktreeProfile.builder().brand(brand).build());

        // Wait, a better way to clear the slug:
        // We know if they wanted to clear it, they sent "", which we converted to null.
        // Wait, if they omit it entirely, it is also null.
        // So we can't tell them apart without an explicit flag. But actually,
        // since it's a PUT request containing the full form state, if slug is null,
        // it means it should be cleared!
        profile.setSlug(req.getSlug());

        if (req.getBio() != null) profile.setBio(req.getBio());
        if (req.getDisplayName() != null) profile.setDisplayName(req.getDisplayName());
        if (req.getWebsiteLabel() != null) profile.setWebsiteLabel(req.getWebsiteLabel());
        if (req.getBgStyle() != null) profile.setBgStyle(req.getBgStyle());
        if (req.getBgImageUrl() != null) profile.setBgImageUrl(req.getBgImageUrl());
        if (req.getButtonStyle() != null) profile.setButtonStyle(req.getButtonStyle());
        if (req.getCustomLinks() != null) profile.setCustomLinks(req.getCustomLinks());
        profile.setPublished(req.isPublished());

        if (req.getWebsite() != null) {
            brand.setWebsite(req.getWebsite());
            brandRepository.save(brand);
        }

        return profileRepository.save(profile);
    }

    // ── Clear background image ───────────────────────────────────────────────

    @Transactional
    public BrandLinktreeProfile clearBgImage(UUID brandId) {
        BrandLinktreeProfile profile = profileRepository.findByBrandId(brandId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        profile.setBgImageUrl(null);
        return profileRepository.save(profile);
    }

    // ── Get profile by brand ID ──────────────────────────────────────────────

    public Optional<BrandLinktreeProfile> getByBrandId(UUID brandId) {
        return profileRepository.findByBrandId(brandId);
    }

    // ── Get public profile (slug OR brand-id as fallback) ────────────────────

    public Map<String, Object> getPublicProfile(String slugOrId) {
        // Try slug first
        Optional<BrandLinktreeProfile> optProfile = profileRepository.findBySlug(slugOrId);

        // Fallback: try parsing as UUID (brand ID)
        if (optProfile.isEmpty()) {
            try {
                UUID brandId = UUID.fromString(slugOrId);
                optProfile = profileRepository.findByBrandId(brandId);
            } catch (IllegalArgumentException ignored) {}
        }

        BrandLinktreeProfile profile = optProfile
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        if (!profile.isPublished()) {
            throw new RuntimeException("This profile is not published");
        }

        Brand brand = profile.getBrand();
        List<SocialConnection> connections = oauthService.getConnectionsByBrand(brand.getId());

        // Build social links list (platform → page name/url, deduplicated by platform)
        List<Map<String, Object>> socialLinks = new ArrayList<>();
        Set<PlatformType> seen = new HashSet<>();
        for (SocialConnection conn : connections) {
            if (seen.contains(conn.getPlatform())) continue;
            seen.add(conn.getPlatform());
            Map<String, Object> link = new LinkedHashMap<>();
            link.put("platform", conn.getPlatform().name().toLowerCase());
            link.put("accountName", conn.getAccountName());
            // Use first page URL if available
            if (!conn.getPages().isEmpty()) {
                SocialPage page = conn.getPages().get(0);
                link.put("pageName", page.getPageName());
                link.put("pageImageUrl", page.getPageImageUrl());
            }
            socialLinks.add(link);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", profile.getId());
        result.put("slug", profile.getSlug() != null ? profile.getSlug() : brand.getId().toString());
        result.put("displayName", profile.getDisplayName() != null ? profile.getDisplayName() : brand.getName());
        result.put("bio", profile.getBio() != null ? profile.getBio() : brand.getDescription());
        result.put("websiteLabel", profile.getWebsiteLabel());
        result.put("website", brand.getWebsite());
        result.put("logoUrl", brand.getLogoUrl());
        result.put("primaryColor", brand.getPrimaryColor());
        result.put("bgStyle", profile.getBgStyle());
        result.put("bgImageUrl", profile.getBgImageUrl());
        result.put("buttonStyle", profile.getButtonStyle());
        result.put("socialLinks", socialLinks);
        result.put("customLinks", profile.getCustomLinks() != null ? profile.getCustomLinks() : "[]");
        result.put("updatedAt", profile.getUpdatedAt());
        return result;
    }

    // ── Serialise profile settings for the settings panel ───────────────────

    public Map<String, Object> toSettingsMap(BrandLinktreeProfile p, Brand brand) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId());
        map.put("slug", p.getSlug());
        map.put("bio", p.getBio());
        map.put("displayName", p.getDisplayName());
        map.put("websiteLabel", p.getWebsiteLabel());
        map.put("bgStyle", p.getBgStyle());
        map.put("bgImageUrl", p.getBgImageUrl());
        map.put("buttonStyle", p.getButtonStyle());
        map.put("published", p.isPublished());
        map.put("customLinks", p.getCustomLinks() != null ? p.getCustomLinks() : "[]");
        map.put("brandId", brand.getId());
        map.put("brandName", brand.getName());
        map.put("logoUrl", brand.getLogoUrl());
        map.put("website", brand.getWebsite());
        map.put("primaryColor", brand.getPrimaryColor());
        map.put("publicUrl", "/p/" + (p.getSlug() != null ? p.getSlug() : brand.getId().toString()));
        return map;
    }
}
