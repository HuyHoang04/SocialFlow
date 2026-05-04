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

    @org.springframework.data.jpa.repository.Query("SELECT i.platformMessageId FROM InboxMessage i WHERE i.page.id = :pageId")
    java.util.Set<String> findPlatformMessageIdsByPageId(@org.springframework.data.repository.query.Param("pageId") UUID pageId);

    Optional<InboxMessage> findByPlatformMessageIdAndPageId(String platformMessageId, UUID pageId);

    List<InboxMessage> findByPageIdOrderByCreatedAtDesc(UUID pageId);

    List<InboxMessage> findByConversationIdAndPageId(String conversationId, UUID pageId);

    // Find existing DMs by the sender's PSID to resolve their thread conversationId
    List<InboxMessage> findByAuthorIdAndPageIdAndMessageType(
            String authorId, UUID pageId,
            com.socialflow.model.enums.MessageType messageType);
}
