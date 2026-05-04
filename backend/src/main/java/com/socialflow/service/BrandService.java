package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.CreateBrandRequest;
import com.socialflow.model.Brand;
import com.socialflow.model.User;
import com.socialflow.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;

    public List<Brand> getBrandsByUser(User user) {
        return brandRepository.findByUserId(user.getId());
    }

    public Brand createBrand(User user, CreateBrandRequest request) {
        Brand brand = Brand.builder()
                .name(request.getName())
                .description(request.getDescription())
                .logoUrl(request.getLogoUrl())
                .user(user)
                .build();
        return brandRepository.save(brand);
    }

    public Brand getBrandById(UUID id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));
    }

    public void deleteBrand(UUID id, User user) {
        Brand brand = getBrandById(id);
        if (!brand.getUser().getId().equals(user.getId())) {
            throw new RuntimeException(ErrorMessages.NOT_AUTHORIZED);
        }
        brandRepository.delete(brand);
    }

    public Brand updateBrand(UUID id, User user, CreateBrandRequest request) {
        Brand brand = getBrandById(id);
        if (!brand.getUser().getId().equals(user.getId())) {
            throw new RuntimeException(ErrorMessages.NOT_AUTHORIZED);
        }
        brand.setName(request.getName());
        brand.setDescription(request.getDescription());
        brand.setLogoUrl(request.getLogoUrl());
        return brandRepository.save(brand);
    }
}
