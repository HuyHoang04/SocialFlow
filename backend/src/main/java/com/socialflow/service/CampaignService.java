package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.CampaignRequest;
import com.socialflow.dto.CampaignResponse;
import com.socialflow.model.Brand;
import com.socialflow.model.Campaign;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final BrandRepository brandRepository;
    private final BrandTeamService brandTeamService;

    public CampaignResponse createCampaign(UUID brandId, UUID userId, CampaignRequest request) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        // Check if user is a team member of this brand
        if (!brandTeamService.canUserAccessBrand(userId, brandId)) {
            throw new RuntimeException(ErrorMessages.BRAND_UNAUTHORIZED);
        }

        Campaign campaign = Campaign.builder()
                .name(request.getName())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .brand(brand)
                .build();

        campaign = campaignRepository.save(campaign);
        return toResponse(campaign);
    }

    public List<CampaignResponse> getCampaignsByBrand(UUID brandId, UUID userId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        // Check if user is a team member of this brand
        if (!brandTeamService.canUserAccessBrand(userId, brandId)) {
            throw new RuntimeException(ErrorMessages.BRAND_UNAUTHORIZED);
        }

        return campaignRepository.findByBrandIdOrderByStartDateDesc(brandId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public void deleteCampaign(UUID id, UUID userId) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.CAMPAIGN_NOT_FOUND));

        UUID brandId = campaign.getBrand().getId();
        // Check if user is a team member of this brand
        if (!brandTeamService.canUserAccessBrand(userId, brandId)) {
            throw new RuntimeException(ErrorMessages.CAMPAIGN_UNAUTHORIZED);
        }

        campaignRepository.delete(campaign);
    }

    private CampaignResponse toResponse(Campaign campaign) {
        return CampaignResponse.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .description(campaign.getDescription())
                .startDate(campaign.getStartDate())
                .endDate(campaign.getEndDate())
                .brandId(campaign.getBrand().getId())
                .build();
    }
}
