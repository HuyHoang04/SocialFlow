package com.socialflow.controller;

import com.socialflow.service.InboxEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

/**
 * SSE endpoint for real-time inbox updates pushed from the server to the browser.
 * The frontend connects once with EventSource and receives new_message events
 * whenever Facebook pushes a webhook event.
 */
@RestController
@RequestMapping("/api/inbox")
@RequiredArgsConstructor
@Slf4j
public class InboxSseController {

    private final InboxEventPublisher inboxEventPublisher;

    /**
     * Frontend calls:  const es = new EventSource('/api/inbox/stream?brandId=<uuid>&token=<jwt>');
     *
     * We read the token from the query param because EventSource API does NOT support
     * custom headers. We validate it manually here.
     */
    @GetMapping(value = "/stream", produces = "text/event-stream")
    public SseEmitter stream(
            @RequestParam UUID brandId,
            @RequestParam(required = false) String token,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        log.info("[SSE] New subscription request for brandId={}", brandId);
        // Token can come either from Authorization header or ?token= query param
        // (EventSource doesn't support headers, so we accept both)
        return inboxEventPublisher.subscribe(brandId);
    }
}
