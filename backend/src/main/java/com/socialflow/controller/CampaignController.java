package com.socialflow.controller;

import com.socialflow.dto.CampaignRequest;
import com.socialflow.dto.CampaignResponse;
import com.socialflow.model.User;
import com.socialflow.service.CampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @GetMapping("/brands/{brandId}/campaigns")
    public ResponseEntity<List<CampaignResponse>> getCampaigns(
            @PathVariable UUID brandId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(campaignService.getCampaignsByBrand(brandId, user.getId()));
    }

    @PostMapping("/brands/{brandId}/campaigns")
    public ResponseEntity<CampaignResponse> createCampaign(
            @PathVariable UUID brandId,
            @RequestBody CampaignRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(campaignService.createCampaign(brandId, user.getId(), request));
    }

    @DeleteMapping("/campaigns/{id}")
    public ResponseEntity<Void> deleteCampaign(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        campaignService.deleteCampaign(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
