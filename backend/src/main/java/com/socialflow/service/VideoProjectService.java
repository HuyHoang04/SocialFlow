package com.socialflow.service;

import com.socialflow.dto.VideoProjectDTO;
import com.socialflow.dto.VideoSceneDTO;
import com.socialflow.model.Brand;
import com.socialflow.model.VideoProject;
import com.socialflow.model.VideoScene;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.VideoProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VideoProjectService {

    private final VideoProjectRepository videoProjectRepository;
    private final BrandRepository brandRepository;

    @Transactional(readOnly = true)
    public List<VideoProjectDTO> getProjectsByBrand(UUID brandId) {
        return videoProjectRepository.findByBrandIdOrderByUpdatedAtDesc(brandId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VideoProjectDTO getProject(UUID projectId) {
        return videoProjectRepository.findById(projectId)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    @Transactional
    public VideoProjectDTO createProject(UUID brandId, VideoProjectDTO dto) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));

        VideoProject project = new VideoProject();
        project.setBrand(brand);
        project.setTitle(dto.getTitle());
        project.setAvatarUrl(dto.getAvatarUrl());
        project.setVoiceUri(dto.getVoiceUri());

        project = videoProjectRepository.save(project);
        return mapToDTO(project);
    }

    @Transactional
    public VideoProjectDTO updateProject(UUID projectId, VideoProjectDTO dto) {
        VideoProject project = videoProjectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        project.setTitle(dto.getTitle());
        project.setAvatarUrl(dto.getAvatarUrl());
        project.setVoiceUri(dto.getVoiceUri());

        // Update scenes
        project.getScenes().clear();
        if (dto.getScenes() != null) {
            for (VideoSceneDTO sceneDto : dto.getScenes()) {
                VideoScene scene = new VideoScene();
                scene.setTitle(sceneDto.getTitle());
                scene.setScript(sceneDto.getScript());
                scene.setGesture(sceneDto.getGesture());
                scene.setIsMoving(sceneDto.getIsMoving() != null ? sceneDto.getIsMoving() : false);
                scene.setMediaUrl(sceneDto.getMediaUrl());
                scene.setMediaScale(sceneDto.getMediaScale());
                scene.setMediaWidth(sceneDto.getMediaWidth());
                scene.setMediaHeight(sceneDto.getMediaHeight());
                scene.setCameraPosition(sceneDto.getCameraPosition());
                scene.setCameraTarget(sceneDto.getCameraTarget());
                scene.setSnapshotUrl(sceneDto.getSnapshotUrl());
                scene.setOrderIndex(sceneDto.getOrderIndex());
                scene.setProject(project);
                project.getScenes().add(scene);
            }
        }

        project = videoProjectRepository.save(project);
        return mapToDTO(project);
    }

    @Transactional
    public void deleteProject(UUID projectId) {
        videoProjectRepository.deleteById(projectId);
    }

    private VideoProjectDTO mapToDTO(VideoProject entity) {
        List<VideoSceneDTO> sceneDTOs = entity.getScenes().stream().map(scene -> 
            VideoSceneDTO.builder()
                .id(scene.getId())
                .title(scene.getTitle())
                .script(scene.getScript())
                .gesture(scene.getGesture())
                .isMoving(scene.getIsMoving() != null ? scene.getIsMoving() : false)
                .mediaUrl(scene.getMediaUrl())
                .mediaScale(scene.getMediaScale())
                .mediaWidth(scene.getMediaWidth())
                .mediaHeight(scene.getMediaHeight())
                .cameraPosition(scene.getCameraPosition())
                .cameraTarget(scene.getCameraTarget())
                .snapshotUrl(scene.getSnapshotUrl())
                .orderIndex(scene.getOrderIndex())
                .build()
        ).collect(Collectors.toList());

        return VideoProjectDTO.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .avatarUrl(entity.getAvatarUrl())
                .voiceUri(entity.getVoiceUri())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .brandId(entity.getBrand().getId())
                .scenes(sceneDTOs)
                .build();
    }
}
