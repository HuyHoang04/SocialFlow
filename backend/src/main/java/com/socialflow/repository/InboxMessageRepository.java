package com.socialflow.repository;

import com.socialflow.model.InboxMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InboxMessageRepository extends JpaRepository<InboxMessage, UUID> {
    
    List<InboxMessage> findByPageConnectionBrandIdOrderByCreatedAtDesc(UUID brandId);
    
    Optional<InboxMessage> findByPlatformMessageIdAndPageId(String platformMessageId, UUID pageId);
    
    // Optional: Get messages for a specific page
    List<InboxMessage> findByPageIdOrderByCreatedAtDesc(UUID pageId);
}
