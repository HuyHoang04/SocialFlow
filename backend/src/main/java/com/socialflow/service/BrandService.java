package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.CreateBrandRequest;
import com.socialflow.model.Brand;
import com.socialflow.model.BrandTeamMember;
import com.socialflow.model.User;
import com.socialflow.model.enums.UserRole;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.BrandTeamMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;
    private final BrandTeamMemberRepository brandTeamMemberRepository;
    private final BrandTeamService brandTeamService;

    public List<Brand> getBrandsByUser(User user) {
        // Get all brands where user is a team member
        List<BrandTeamMember> teamMembers = brandTeamMemberRepository.findByUserId(user.getId());
        List<UUID> brandIds = teamMembers.stream()
                .map(member -> member.getBrand().getId())
                .toList();
        
        if (brandIds.isEmpty()) {
            return List.of();
        }
        
        return brandRepository.findAllById(brandIds);
    }

    @Transactional
    public Brand createBrand(User user, CreateBrandRequest request) {
        Brand brand = Brand.builder()
                .name(request.getName())
                .description(request.getDescription())
                .logoUrl(request.getLogoUrl())
                .website(request.getWebsite())
                .contactEmail(request.getContactEmail())
                .phone(request.getPhone())
                .industry(request.getIndustry())
                .country(request.getCountry())
                .brandSlogan(request.getBrandSlogan())
                .primaryColor(request.getPrimaryColor())
                .secondaryColor(request.getSecondaryColor())
                .aiVoiceGuidelines(request.getAiVoiceGuidelines())
                .aiContentGuardrails(request.getAiContentGuardrails())
                .user(user)
                .build();
        brand = brandRepository.save(brand);

        // Make creator ADMIN in the brand
        brandTeamService.addTeamMember(brand.getId(), user.getId(), UserRole.ADMIN);

        return brand;
    }

    public Brand getBrandById(UUID id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));
    }

    public void deleteBrand(UUID id, User user) {
        Brand brand = getBrandById(id);
        // Only ADMIN members can delete the brand
        if (!brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.ADMIN)) {
            throw new RuntimeException(ErrorMessages.NOT_AUTHORIZED);
        }
        
        // Delete all team members first (due to foreign key constraint)
        // This prevents "violates foreign key constraint" error
        List<BrandTeamMember> teamMembers = brandTeamService.getTeamMembers(id);
        for (BrandTeamMember member : teamMembers) {
            brandTeamService.removeTeamMember(id, member.getUser().getId());
        }
        
        // Now safe to delete the brand (connections have cascade delete)
        brandRepository.delete(brand);
    }

    public Brand updateBrand(UUID id, User user, CreateBrandRequest request) {
        Brand brand = getBrandById(id);
        // Only ADMIN members can update the brand
        if (!brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.ADMIN)) {
            throw new RuntimeException(ErrorMessages.NOT_AUTHORIZED);
        }
        brand.setName(request.getName());
        brand.setDescription(request.getDescription());
        brand.setLogoUrl(request.getLogoUrl());
        brand.setWebsite(request.getWebsite());
        brand.setContactEmail(request.getContactEmail());
        brand.setPhone(request.getPhone());
        brand.setIndustry(request.getIndustry());
        brand.setCountry(request.getCountry());
        brand.setBrandSlogan(request.getBrandSlogan());
        brand.setPrimaryColor(request.getPrimaryColor());
        brand.setSecondaryColor(request.getSecondaryColor());
        if (request.getAiVoiceGuidelines() != null) {
            brand.setAiVoiceGuidelines(request.getAiVoiceGuidelines());
        }
        if (request.getAiContentGuardrails() != null) {
            brand.setAiContentGuardrails(request.getAiContentGuardrails());
        }
        return brandRepository.save(brand);
    }

    public Brand updateBrandLogo(UUID brandId, String logoUrl) {
        Brand brand = getBrandById(brandId);
        brand.setLogoUrl(logoUrl);
        return brandRepository.save(brand);
    }

    public Brand updateAIPreferences(UUID id, User user, String voiceGuidelines, String contentGuardrails) {
        Brand brand = getBrandById(id);
        // Check permissions: ADMIN or MANAGER
        if (!brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.ADMIN) && 
            !brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.MANAGER)) {
            throw new RuntimeException(ErrorMessages.NOT_AUTHORIZED);
        }
        brand.setAiVoiceGuidelines(voiceGuidelines);
        brand.setAiContentGuardrails(contentGuardrails);
        return brandRepository.save(brand);
    }

    public void removeBrandLogo(UUID brandId) {
        Brand brand = getBrandById(brandId);
        brand.setLogoUrl(null);
        brandRepository.save(brand);
    }

    /**
     * Migration: Add brand creators as ADMIN team members (for existing brands created before RBAC)
     * Runs on application startup
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void migrateExistingBrandCreators() {
        log.info("🔄 Starting brand creator RBAC migration...");
        
        List<Brand> allBrands = brandRepository.findAll();
        int migratedCount = 0;
        
        for (Brand brand : allBrands) {
            // Check if brand creator already has team membership
            boolean alreadyMember = brandTeamMemberRepository.findByBrandIdAndUserId(
                    brand.getId(), 
                    brand.getUser().getId()
            ).isPresent();
            
            if (!alreadyMember) {
                // Add creator as ADMIN
                BrandTeamMember teamMember = BrandTeamMember.builder()
                        .brand(brand)
                        .user(brand.getUser())
                        .role(UserRole.ADMIN)
                        .build();
                brandTeamMemberRepository.save(teamMember);
                migratedCount++;
                log.info("✅ Added {} as ADMIN to brand: {}", brand.getUser().getEmail(), brand.getName());
            }
        }
        
        log.info("✨ Brand creator migration complete! Migrated {} brands.", migratedCount);
    }
}

