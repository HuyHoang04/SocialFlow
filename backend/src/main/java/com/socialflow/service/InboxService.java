package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.InboxMessageResponse;
import com.socialflow.dto.PlatformCommentDto;
import com.socialflow.model.Brand;
import com.socialflow.model.InboxMessage;
import com.socialflow.model.SocialPage;
import com.socialflow.model.enums.MessageType;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.InboxMessageRepository;
import com.socialflow.repository.SocialPageRepository;
import com.socialflow.service.publisher.FacebookPublisher;
import com.socialflow.service.publisher.InstagramPublisher;
import com.socialflow.service.publisher.ThreadsPublisher;
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
    private final BrandTeamService brandTeamService;
    private final SocialPageRepository pageRepository;
    private final CommentFetcherService commentFetcherService;
    private final FacebookPublisher facebookPublisher;
    private final InstagramPublisher instagramPublisher;
    private final ThreadsPublisher threadsPublisher;

    @Transactional
    public void syncMessages(UUID brandId, UUID userId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        // Check if user is a team member of this brand
        if (!brandTeamService.canUserAccessBrand(userId, brandId)) {
            throw new RuntimeException(ErrorMessages.BRAND_UNAUTHORIZED);
        }

        // Fetch all connected pages for this brand
        List<SocialPage> pages = pageRepository.findByConnectionBrandId(brandId);

        for (SocialPage page : pages) {
            log.info("Starting sync for Page: {}", page.getPageName());
            
            // Fix N+1: load all existing platform message IDs into a set
            java.util.Set<String> existingIds = inboxRepository.findPlatformMessageIdsByPageId(page.getId());
            List<InboxMessage> batchToSave = new java.util.ArrayList<>();

            // ── Comments: platform-agnostic via CommentFetcherService ──
            log.info("Syncing {} comments for Page: {}", page.getPlatform(), page.getPageName());
            List<PlatformCommentDto> comments = commentFetcherService.fetchComments(page);

            for (PlatformCommentDto comment : comments) {
                if (!existingIds.contains(comment.getPlatformMessageId())) {
                    boolean isFromMe = comment.getAuthorId() != null
                            ? page.getPlatformPageId().equals(comment.getAuthorId())
                            : page.getPageName().equalsIgnoreCase(comment.getAuthorName());

                    InboxMessage msg = InboxMessage.builder()
                            .platformMessageId(comment.getPlatformMessageId())
                            .platformPostId(comment.getPlatformPostId())
                            .parentMessageId(comment.getParentMessageId())
                            .content(comment.getContent())
                            .authorName(comment.getAuthorName())
                            .authorId(comment.getAuthorId())
                            .messageType(MessageType.COMMENT)
                            .createdAt(comment.getCreatedAt())
                            .likeCount(comment.getLikeCount() != null ? comment.getLikeCount() : 0)
                            .page(page)
                            .isRead(isFromMe)
                            .isFromMe(isFromMe)
                            .build();

                    batchToSave.add(msg);
                    existingIds.add(comment.getPlatformMessageId());
                }
            }

            // ── DMs: Facebook-specific (Messenger) ──
            if (page.getPlatform() == PlatformType.FACEBOOK) {
                log.info("Syncing Facebook DMs for Page: {}", page.getPageName());
                List<PlatformCommentDto> dms = facebookPublisher.fetchDirectMessages(page);
                for (PlatformCommentDto dm : dms) {
                    if (!existingIds.contains(dm.getPlatformMessageId())) {
                        boolean isFromMe = dm.getAuthorId() != null
                                ? page.getPlatformPageId().equals(dm.getAuthorId())
                                : page.getPageName().equalsIgnoreCase(dm.getAuthorName());

                        InboxMessage msg = InboxMessage.builder()
                                .platformMessageId(dm.getPlatformMessageId())
                                .platformPostId(dm.getPlatformPostId())
                                .parentMessageId(dm.getParentMessageId())
                                .conversationId(dm.getConversationId())
                                .messageType(MessageType.DIRECT_MESSAGE)
                                .content(dm.getContent() == null ? "" : dm.getContent())
                                .authorName(dm.getAuthorName())
                                .authorId(dm.getAuthorId())
                                .createdAt(dm.getCreatedAt())
                                .page(page)
                                .isRead(isFromMe)
                                .isFromMe(isFromMe)
                                .build();

                        batchToSave.add(msg);
                        existingIds.add(dm.getPlatformMessageId());
                    }
                }
            }

            // ── DMs: Instagram-specific (Instagram Direct Messages) ──
            if (page.getPlatform() == PlatformType.INSTAGRAM) {
                log.info("Syncing Instagram DMs for Page: {}", page.getPageName());
                List<PlatformCommentDto> dms = instagramPublisher.fetchDirectMessages(page);
                for (PlatformCommentDto dm : dms) {
                    if (!existingIds.contains(dm.getPlatformMessageId())) {
                        boolean isFromMe = dm.getAuthorId() != null
                                ? page.getPlatformPageId().equals(dm.getAuthorId())
                                : page.getPageName().equalsIgnoreCase(dm.getAuthorName());

                        InboxMessage msg = InboxMessage.builder()
                                .platformMessageId(dm.getPlatformMessageId())
                                .platformPostId(dm.getPlatformPostId())
                                .parentMessageId(dm.getParentMessageId())
                                .conversationId(dm.getConversationId())
                                .messageType(MessageType.DIRECT_MESSAGE)
                                .content(dm.getContent() == null ? "" : dm.getContent())
                                .authorName(dm.getAuthorName())
                                .authorId(dm.getAuthorId())
                                .createdAt(dm.getCreatedAt())
                                .page(page)
                                .isRead(isFromMe)
                                .isFromMe(isFromMe)
                                .build();

                        batchToSave.add(msg);
                        existingIds.add(dm.getPlatformMessageId());
                    }
                }
            }

            // ── DMs: Threads-specific (Threads Direct Messages) ──
            if (page.getPlatform() == PlatformType.THREADS) {
                log.info("Syncing Threads DMs for Page: {}", page.getPageName());
                List<PlatformCommentDto> dms = threadsPublisher.fetchDirectMessages(page);
                for (PlatformCommentDto dm : dms) {
                    if (!existingIds.contains(dm.getPlatformMessageId())) {
                        boolean isFromMe = dm.getAuthorId() != null
                                ? page.getPlatformPageId().equals(dm.getAuthorId())
                                : page.getPageName().equalsIgnoreCase(dm.getAuthorName());

                        InboxMessage msg = InboxMessage.builder()
                                .platformMessageId(dm.getPlatformMessageId())
                                .platformPostId(dm.getPlatformPostId())
                                .parentMessageId(dm.getParentMessageId())
                                .conversationId(dm.getConversationId())
                                .messageType(MessageType.DIRECT_MESSAGE)
                                .content(dm.getContent() == null ? "" : dm.getContent())
                                .authorName(dm.getAuthorName())
                                .authorId(dm.getAuthorId())
                                .createdAt(dm.getCreatedAt())
                                .page(page)
                                .isRead(isFromMe)
                                .isFromMe(isFromMe)
                                .build();

                        batchToSave.add(msg);
                        existingIds.add(dm.getPlatformMessageId());
                    }
                }
            }

            // Perform Bulk Insert
            if (!batchToSave.isEmpty()) {
                log.info("Saving {} new messages in bulk for page {}", batchToSave.size(), page.getPageName());
                inboxRepository.saveAll(batchToSave);
            }
        }
    }

    public List<InboxMessageResponse> getMessages(UUID brandId, UUID userId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        // Check if user is a team member of this brand
        if (!brandTeamService.canUserAccessBrand(userId, brandId)) {
            throw new RuntimeException(ErrorMessages.BRAND_UNAUTHORIZED);
        }

        return inboxRepository.findByPageConnectionBrandIdOrderByCreatedAtDesc(brandId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public InboxMessageResponse replyToMessage(UUID messageId, String replyContent, UUID userId) {
        InboxMessage message = inboxRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.MESSAGE_NOT_FOUND));

        UUID brandId = message.getPage().getConnection().getBrand().getId();
        // Check if user is a team member of this brand
        if (!brandTeamService.canUserAccessBrand(userId, brandId)) {
            throw new RuntimeException(ErrorMessages.UNAUTHORIZED);
        }

        SocialPage page = message.getPage();

        if (page.getPlatform() == PlatformType.FACEBOOK) {
            if (message.getMessageType() == MessageType.DIRECT_MESSAGE) {
                // Find recipient PSID: the non-page author in the conversation
                String recipientPsid = inboxRepository
                        .findByConversationIdAndPageId(message.getConversationId(), page.getId())
                        .stream()
                        .filter(m -> !Boolean.TRUE.equals(m.getIsFromMe()) && m.getAuthorId() != null)
                        .map(InboxMessage::getAuthorId)
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Cannot determine DM recipient PSID"));
                facebookPublisher.replyToDM(page, recipientPsid, replyContent);
            } else {
                facebookPublisher.replyToComment(page, message.getPlatformMessageId(), replyContent);
            }
        } else if (page.getPlatform() == PlatformType.INSTAGRAM) {
            if (message.getMessageType() == MessageType.DIRECT_MESSAGE) {
                instagramPublisher.replyToDM(page, message.getConversationId(), replyContent);
            } else {
                instagramPublisher.replyToComment(page, message.getPlatformMessageId(), replyContent);
            }
        } else if (page.getPlatform() == PlatformType.THREADS) {
            if (message.getMessageType() == MessageType.DIRECT_MESSAGE) {
                threadsPublisher.replyToDM(page, message.getConversationId(), replyContent);
            } else {
                threadsPublisher.replyToComment(page, message.getPlatformMessageId(), replyContent);
            }
        } else {
            throw new RuntimeException(ErrorMessages.REPLIES_NOT_SUPPORTED + page.getPlatform());
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
                .orElseThrow(() -> new RuntimeException(ErrorMessages.MESSAGE_NOT_FOUND));

        UUID brandId = message.getPage().getConnection().getBrand().getId();
        // Check if user is a team member of this brand
        if (!brandTeamService.canUserAccessBrand(userId, brandId)) {
            throw new RuntimeException(ErrorMessages.UNAUTHORIZED);
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
                .messageType(message.getMessageType() != null ? message.getMessageType() : MessageType.COMMENT)
                .conversationId(message.getConversationId())
                .likeCount(message.getLikeCount())
                .pageId(message.getPage().getId())
                .pageName(message.getPage().getPageName())
                .platform(message.getPage().getPlatform())
                .build();
    }
}

