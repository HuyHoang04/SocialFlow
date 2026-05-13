package com.socialflow.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.Map;

@Slf4j
@Service
public class CloudinaryService {

    @Value("${cloudinary.cloud-name}")
    private String cloudName;

    @Value("${cloudinary.api-key}")
    private String apiKey;

    @Value("${cloudinary.api-secret}")
    private String apiSecret;

    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
        log.info("☁️ Cloudinary initialized: cloud_name={}", cloudName);
    }

    /**
     * Upload an image to Cloudinary.
     *
     * @param file   The multipart file to upload
     * @param folder The folder in Cloudinary (e.g., "socialflow/avatars")
     * @param publicId Optional custom public ID (without folder prefix)
     * @return The secure URL of the uploaded image
     */
    @SuppressWarnings("unchecked")
    public String uploadImage(MultipartFile file, String folder, String publicId) throws IOException {
        Map<String, Object> params = ObjectUtils.asMap(
                "folder", folder,
                "overwrite", true,
                "resource_type", "image",
                "transformation", "c_limit,w_800,h_800,q_auto,f_auto"
        );

        if (publicId != null && !publicId.isEmpty()) {
            params.put("public_id", publicId);
        }

        Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
        String secureUrl = (String) result.get("secure_url");
        log.info("☁️ Uploaded image to Cloudinary: folder={}, url={}", folder, secureUrl);
        return secureUrl;
    }

    /**
     * Upload a general media file (image or video) to Cloudinary.
     */
    public String uploadMedia(MultipartFile file, String folder) throws IOException {
        Map<String, Object> params = com.cloudinary.utils.ObjectUtils.asMap(
                "folder", folder,
                "overwrite", true,
                "resource_type", "auto"
        );

        Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
        String secureUrl = (String) result.get("secure_url");
        log.info("☁️ Uploaded media to Cloudinary: folder={}, url={}", folder, secureUrl);
        return secureUrl;
    }

    /**
     * Upload an avatar image (square crop, optimized).
     */
    public String uploadAvatar(MultipartFile file, String userId) throws IOException {
        return uploadImage(file, "socialflow/avatars", userId);
    }

    /**
     * Upload a brand logo (square crop, optimized).
     */
    public String uploadBrandLogo(MultipartFile file, String brandId) throws IOException {
        return uploadImage(file, "socialflow/brands", brandId);
    }

    /**
     * Delete an image from Cloudinary by its public ID.
     *
     * @param publicId Full public ID including folder (e.g., "socialflow/avatars/user-uuid")
     */
    @SuppressWarnings("unchecked")
    public boolean deleteImage(String publicId) {
        try {
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            String status = (String) result.get("result");
            log.info("☁️ Delete image from Cloudinary: publicId={}, result={}", publicId, status);
            return "ok".equals(status);
        } catch (IOException e) {
            log.error("☁️ Failed to delete image from Cloudinary: publicId={}", publicId, e);
            return false;
        }
    }

    /**
     * Delete a user avatar from Cloudinary.
     */
    public boolean deleteAvatar(String userId) {
        return deleteImage("socialflow/avatars/" + userId);
    }

    /**
     * Delete a brand logo from Cloudinary.
     */
    public boolean deleteBrandLogo(String brandId) {
        return deleteImage("socialflow/brands/" + brandId);
    }
}
