package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.model.Brand;
import com.socialflow.model.BrandTeamMember;
import com.socialflow.model.User;
import com.socialflow.model.enums.UserRole;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.BrandTeamMemberRepository;
import com.socialflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BrandTeamService {

    private final BrandTeamMemberRepository brandTeamMemberRepository;
    private final UserRepository userRepository;
    private final BrandRepository brandRepository;

    /**
     * Add a user to a brand's team with specified role
     */
    @Transactional
    public BrandTeamMember addTeamMember(UUID brandId, UUID userId, UserRole role) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found: " + brandId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // Check if already a member
        if (brandTeamMemberRepository.existsByBrandIdAndUserId(brandId, userId)) {
            throw new RuntimeException("User is already a member of this brand");
        }

        BrandTeamMember member = BrandTeamMember.builder()
                .brand(brand)
                .user(user)
                .role(role)
                .build();

        member = brandTeamMemberRepository.save(member);
        log.info("Added user {} to brand {} with role {}", userId, brandId, role);
        return member;
    }

    /**
     * Remove a user from a brand's team
     */
    @Transactional
    public void removeTeamMember(UUID brandId, UUID userId) {
        BrandTeamMember member = brandTeamMemberRepository.findByBrandIdAndUserId(brandId, userId)
                .orElseThrow(() -> new RuntimeException("User is not a member of this brand"));

        brandTeamMemberRepository.delete(member);
        log.info("Removed user {} from brand {}", userId, brandId);
    }

    /**
     * Update a user's role in a brand
     */
    @Transactional
    public BrandTeamMember updateMemberRole(UUID brandId, UUID userId, UserRole newRole) {
        BrandTeamMember member = brandTeamMemberRepository.findByBrandIdAndUserId(brandId, userId)
                .orElseThrow(() -> new RuntimeException("User is not a member of this brand"));

        member.setRole(newRole);
        member = brandTeamMemberRepository.save(member);
        log.info("Updated user {} role in brand {} to {}", userId, brandId, newRole);
        return member;
    }

    /**
     * Get all team members of a brand
     */
    public List<BrandTeamMember> getTeamMembers(UUID brandId) {
        return brandTeamMemberRepository.findByBrandId(brandId);
    }

    /**
     * Get all brands that a user is a member of
     */
    public List<Brand> getUserBrands(UUID userId) {
        List<BrandTeamMember> memberships = brandTeamMemberRepository.findByUserId(userId);
        return memberships.stream()
                .map(BrandTeamMember::getBrand)
                .collect(Collectors.toList());
    }

    /**
     * Check if a user has access to a brand
     */
    public boolean canUserAccessBrand(UUID userId, UUID brandId) {
        return brandTeamMemberRepository.existsByBrandIdAndUserId(brandId, userId);
    }

    /**
     * Get a user's role in a specific brand
     */
    public UserRole getUserRoleInBrand(UUID userId, UUID brandId) {
        BrandTeamMember member = brandTeamMemberRepository.findByBrandIdAndUserId(brandId, userId)
                .orElseThrow(() -> new RuntimeException("User is not a member of this brand"));
        return member.getRole();
    }

    /**
     * Check if user has required role in brand (at least)
     */
    public boolean hasRoleInBrand(UUID userId, UUID brandId, UserRole requiredRole) {
        return brandTeamMemberRepository.findByBrandIdAndUserId(brandId, userId)
                .map(member -> {
                    // ADMIN can do anything
                    if (member.getRole() == UserRole.ADMIN) return true;
                    // MANAGER can do manager tasks
                    if (member.getRole() == UserRole.MANAGER && requiredRole != UserRole.ADMIN) return true;
                    // CREATOR can only do creator tasks
                    return member.getRole() == requiredRole;
                })
                .orElse(false);
    }

    /**
     * Ensure brand has at least one ADMIN
     */
    public boolean hasAdminInBrand(UUID brandId) {
        List<BrandTeamMember> members = brandTeamMemberRepository.findByBrandId(brandId);
        return members.stream().anyMatch(m -> m.getRole() == UserRole.ADMIN);
    }
}
