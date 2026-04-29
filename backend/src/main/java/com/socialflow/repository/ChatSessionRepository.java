package com.socialflow.repository;

import com.socialflow.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {
    List<ChatSession> findByBrandIdAndIsDeletedFalseOrderByUpdatedAtDesc(UUID brandId);
    List<ChatSession> findByUserIdAndIsDeletedFalseOrderByUpdatedAtDesc(UUID userId);
}
