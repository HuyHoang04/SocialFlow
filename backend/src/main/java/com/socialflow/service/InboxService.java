package com.socialflow.service;

import com.socialflow.dto.InboxMessageResponse;
import com.socialflow.dto.PlatformCommentDto;
import com.socialflow.model.Brand;
import com.socialflow.model.InboxMessage;
import com.socialflow.model.SocialPage;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.InboxMessageRepository;
import com.socialflow.repository.SocialPageRepository;
import com.socialflow.service.publisher.FacebookPublisher;
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
public class InboxService {

    private final InboxMessageRepository inboxRepository;
    private final BrandRepository brandRepository;
    private final SocialPageRepository pageRepository;
    private final FacebookPublisher facebookPublisher;

    @Transactional
    public void syncMessages(UUID brandId, UUID userId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));

        if (!brand.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Brand does not belong to user");
        }

        // Fetch all connected pages for this brand
        List<SocialPage> pages = pageRepository.findByConnectionBrandId(brandId);
        
        for (SocialPage page : pages) {
            if (page.getPlatform() == PlatformType.FACEBOOK) {
                log.info("Syncing Facebook Inbox for Page: {}", page.getPageName());
                List<PlatformCommentDto> comments = facebookPublisher.fetchComments(page);
                
                for (PlatformCommentDto comment : comments) {
                    // Check if exists
                    if (inboxRepository.findByPlatformMessageIdAndPageId(comment.getPlatformMessageId(), page.getId()).isEmpty()) {
                        
                        // Check if the comment author is the page itself
                        boolean isFromMe = page.getPageName().equalsIgnoreCase(comment.getAuthorName());
                        
                        InboxMessage msg = InboxMessage.builder()
                                .platformMessageId(comment.getPlatformMessageId())
                                .platformPostId(comment.getPlatformPostId())
                                .parentMessageId(comment.getParentMessageId())
                                .content(comment.getContent())
                                .authorName(comment.getAuthorName())
                                .createdAt(comment.getCreatedAt())
                                .page(page)
                                .isRead(isFromMe) // auto-read our own replies
                                .isFromMe(isFromMe)
                                .build();
                        
                        inboxRepository.save(msg);
                    }
                }
            }
            // Add other platforms like TWITTER here later
        }
    }

    public List<InboxMessageResponse> getMessages(UUID brandId, UUID userId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));

        if (!brand.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Brand does not belong to user");
        }

        return inboxRepository.findByPageConnectionBrandIdOrderByCreatedAtDesc(brandId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public InboxMessageResponse replyToMessage(UUID messageId, String replyContent, UUID userId) {
        InboxMessage message = inboxRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getPage().getConnection().getBrand().getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        SocialPage page = message.getPage();

        if (page.getPlatform() == PlatformType.FACEBOOK) {
            facebookPublisher.replyToComment(page, message.getPlatformMessageId(), replyContent);
        } else {
            throw new RuntimeException("Replies not supported for platform: " + page.getPlatform());
        }

        // After successfully replying via API, mark the original message as read
        message.setIsRead(true);
        inboxRepository.save(message);

        // Resync briefly just to pull in our newly sent reply
        log.info("Reply sent successfully. Re-syncing inbox to pull the reply.");
        syncMessages(page.getConnection().getBrand().getId(), userId);

        return toResponse(message);
    }

    @Transactional
    public InboxMessageResponse markAsRead(UUID messageId, UUID userId) {
        InboxMessage message = inboxRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getPage().getConnection().getBrand().getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        message.setIsRead(true);
        message = inboxRepository.save(message);
        return toResponse(message);
    }

    private InboxMessageResponse toResponse(InboxMessage message) {
        return InboxMessageResponse.builder()
                .id(message.getId())
                .platformMessageId(message.getPlatformMessageId())
                .platformPostId(message.getPlatformPostId())
                .parentMessageId(message.getParentMessageId())
                .content(message.getContent())
                .authorName(message.getAuthorName())
                .authorProfilePic(message.getAuthorProfilePic())
                .createdAt(message.getCreatedAt())
                .isRead(message.getIsRead())
                .isFromMe(message.getIsFromMe())
                .pageId(message.getPage().getId())
                .pageName(message.getPage().getPageName())
                .platform(message.getPage().getPlatform())
                .build();
    }
}
