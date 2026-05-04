package com.socialflow.ai.service;

import com.socialflow.model.AiModelConfig;
import com.socialflow.model.Brand;
import com.socialflow.repository.AiModelConfigRepository;
import com.socialflow.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiModelConfigService {

    private final AiModelConfigRepository aiModelConfigRepository;
    private final BrandRepository brandRepository;

    @Transactional(readOnly = true)
    public AiModelConfig getConfigByBrandId(UUID brandId) {
        return aiModelConfigRepository.findById(brandId)
                .orElse(null);
    }
    
    @Transactional(readOnly = true)
    public AiModelConfig getConfigByBrandIdStr(String brandId) {
        if (brandId == null || brandId.isEmpty()) return null;
        try {
            return getConfigByBrandId(UUID.fromString(brandId));
        } catch (IllegalArgumentException e) {
            log.error("Invalid brand ID format: {}", brandId);
            return null;
        }
    }

    @Transactional
    public AiModelConfig saveConfig(UUID brandId, AiModelConfig config) {
        AiModelConfig existing = aiModelConfigRepository.findById(brandId).orElse(null);
        if (existing != null) {
            existing.setTextProvider(config.getTextProvider());
            existing.setTextModel(config.getTextModel());
            existing.setImageProvider(config.getImageProvider());
            existing.setImageModel(config.getImageModel());
            existing.setEmbeddingProvider(config.getEmbeddingProvider());
            existing.setEmbeddingModel(config.getEmbeddingModel());
            return aiModelConfigRepository.save(existing);
        } else {
            Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new IllegalArgumentException("Brand not found"));
            config.setBrand(brand);
            return aiModelConfigRepository.save(config);
        }
    }
}
