package com.socialflow.controller;

import com.socialflow.dto.InboxMessageResponse;
import com.socialflow.model.User;
import com.socialflow.service.InboxService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InboxController {

    private final InboxService inboxService;

    @Data
    public static class ReplyRequest {
        private String content;
    }

    @PostMapping("/brands/{brandId}/inbox/sync")
    public ResponseEntity<Void> syncInbox(
            @PathVariable UUID brandId,
            @AuthenticationPrincipal User user) {
        inboxService.syncMessages(brandId, user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/brands/{brandId}/inbox")
    public ResponseEntity<List<InboxMessageResponse>> getInbox(
            @PathVariable UUID brandId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(inboxService.getMessages(brandId, user.getId()));
    }

    @PostMapping("/inbox/{messageId}/reply")
    public ResponseEntity<InboxMessageResponse> replyToMessage(
            @PathVariable UUID messageId,
            @RequestBody ReplyRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(inboxService.replyToMessage(messageId, request.getContent(), user.getId()));
    }

    @PutMapping("/inbox/{messageId}/read")
    public ResponseEntity<InboxMessageResponse> markAsRead(
            @PathVariable UUID messageId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(inboxService.markAsRead(messageId, user.getId()));
    }
}
