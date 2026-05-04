package com.socialflow.model;

import com.socialflow.model.enums.MessageType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inbox_messages", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"platform_message_id", "page_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InboxMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "platform_message_id", nullable = false)
    private String platformMessageId;

    @Column(name = "platform_post_id")
    private String platformPostId;

    @Column(name = "parent_message_id")
    private String parentMessageId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "author_name", nullable = false)
    private String authorName;

    @Column(name = "author_profile_pic")
    private String authorProfilePic;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    // Optional: If this is a reply by the Page itself, mark it as from me
    @Column(name = "is_from_me", nullable = false)
    @Builder.Default
    private Boolean isFromMe = false;

    @Column(name = "message_type", length = 50)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MessageType messageType = MessageType.COMMENT;

    @Column(name = "conversation_id")
    private String conversationId;

    @Column(name = "author_id")
    private String authorId;

    @Column(name = "like_count")
    @Builder.Default
    private Integer likeCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id", nullable = false)
    private SocialPage page;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isRead == null) isRead = false;
        if (isFromMe == null) isFromMe = false;
    }
}
