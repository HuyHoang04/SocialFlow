package com.socialflow.controller;

import com.socialflow.dto.LinktreeProfileRequest;
import com.socialflow.model.Brand;
import com.socialflow.model.BrandLinktreeProfile;
import com.socialflow.model.User;
import com.socialflow.model.enums.UserRole;
import com.socialflow.service.BrandLinktreeService;
import com.socialflow.service.BrandService;
import com.socialflow.service.BrandTeamService;
import com.socialflow.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class BrandLinktreeController {

    private final BrandLinktreeService linktreeService;
    private final BrandService brandService;
    private final BrandTeamService brandTeamService;
    private final CloudinaryService cloudinaryService;

    // ── PUBLIC endpoint — no auth ─────────────────────────────────────────────

    /**
     * GET /api/public/p/{slugOrId}
     * Returns full public profile data (only if published = true).
     */
    @GetMapping("/api/public/p/{slugOrId}")
    public ResponseEntity<Map<String, Object>> getPublicProfile(@PathVariable String slugOrId) {
        Map<String, Object> profile = linktreeService.getPublicProfile(slugOrId);
        return ResponseEntity.ok(profile);
    }

    // ── AUTHENTICATED endpoints ───────────────────────────────────────────────

    /**
     * GET /api/brands/{brandId}/linktree
     * Returns current settings for the linktree panel.
     */
    @GetMapping("/api/brands/{brandId}/linktree")
    public ResponseEntity<Map<String, Object>> getSettings(
            @AuthenticationPrincipal User user,
            @PathVariable UUID brandId) {
        checkAccess(user, brandId);
        Brand brand = brandService.getBrandById(brandId);
        Optional<BrandLinktreeProfile> opt = linktreeService.getByBrandId(brandId);

        if (opt.isEmpty()) {
            // Return empty defaults
            return ResponseEntity.ok(Map.of(
                    "brandId", brandId,
                    "brandName", brand.getName(),
                    "logoUrl", brand.getLogoUrl() != null ? brand.getLogoUrl() : "",
                    "website", brand.getWebsite() != null ? brand.getWebsite() : "",
                    "primaryColor", brand.getPrimaryColor() != null ? brand.getPrimaryColor() : "",
                    "bgStyle", "gradient-purple",
                    "buttonStyle", "rounded",
                    "published", false,
                    "publicUrl", "/p/" + brandId
            ));
        }

        return ResponseEntity.ok(linktreeService.toSettingsMap(opt.get(), brand));
    }

    /**
     * PUT /api/brands/{brandId}/linktree
     * Upsert the linktree profile settings.
     */
    @PutMapping("/api/brands/{brandId}/linktree")
    public ResponseEntity<Map<String, Object>> saveSettings(
            @AuthenticationPrincipal User user,
            @PathVariable UUID brandId,
            @RequestBody LinktreeProfileRequest request) {
        checkAccess(user, brandId);
        Brand brand = brandService.getBrandById(brandId);
        BrandLinktreeProfile profile = linktreeService.upsert(brandId, request);
        return ResponseEntity.ok(linktreeService.toSettingsMap(profile, brand));
    }

    /**
     * POST /api/brands/{brandId}/linktree/background
     * Upload a custom background image to Cloudinary.
     */
    @PostMapping("/api/brands/{brandId}/linktree/background")
    public ResponseEntity<Map<String, Object>> uploadBackground(
            @AuthenticationPrincipal User user,
            @PathVariable UUID brandId,
            @RequestParam("file") MultipartFile file) throws IOException {
        checkAccess(user, brandId);

        if (file.isEmpty()) throw new RuntimeException("File is empty");
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) throw new RuntimeException("Only image files are allowed");

        // Upload to Cloudinary
        String url = cloudinaryService.uploadImage(file, "socialflow/linktree-backgrounds", brandId.toString());

        // Persist URL to profile
        LinktreeProfileRequest req = new LinktreeProfileRequest();
        req.setBgImageUrl(url);
        Brand brand = brandService.getBrandById(brandId);
        BrandLinktreeProfile profile = linktreeService.upsert(brandId, req);

        return ResponseEntity.ok(linktreeService.toSettingsMap(profile, brand));
    }

    /**
     * DELETE /api/brands/{brandId}/linktree/background
     * Remove the custom background image.
     */
    @DeleteMapping("/api/brands/{brandId}/linktree/background")
    public ResponseEntity<Map<String, Object>> deleteBackground(
            @AuthenticationPrincipal User user,
            @PathVariable UUID brandId) {
        checkAccess(user, brandId);
        Brand brand = brandService.getBrandById(brandId);
        BrandLinktreeProfile profile = linktreeService.clearBgImage(brandId);
        return ResponseEntity.ok(linktreeService.toSettingsMap(profile, brand));
    }

    /**
     * POST /api/brands/{brandId}/linktree/icon
     * Upload a custom icon/image to Cloudinary for a custom link.
     */
    @PostMapping("/api/brands/{brandId}/linktree/icon")
    public ResponseEntity<Map<String, String>> uploadLinkIcon(
            @AuthenticationPrincipal User user,
            @PathVariable UUID brandId,
            @RequestParam("file") MultipartFile file) throws IOException {
        checkAccess(user, brandId);

        if (file.isEmpty()) throw new RuntimeException("File is empty");
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) throw new RuntimeException("Only image files are allowed");

        // Upload to Cloudinary
        String url = cloudinaryService.uploadImage(file, "socialflow/linktree-icons", UUID.randomUUID().toString());
        return ResponseEntity.ok(Map.of("url", url));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private void checkAccess(User user, UUID brandId) {
        if (!brandTeamService.hasRoleInBrand(user.getId(), brandId, UserRole.MANAGER)) {
            throw new RuntimeException("Only ADMIN or MANAGER can manage the linktree profile");
        }
    }
}
