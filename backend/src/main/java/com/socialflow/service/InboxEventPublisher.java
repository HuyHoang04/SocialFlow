package com.socialflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.socialflow.dto.InboxMessageResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

/**
 * Manages SSE (Server-Sent Events) connections and broadcasts new inbox messages
 * to all connected frontend clients of a brand in real-time.
 */
@Service
@Slf4j
public class InboxEventPublisher {

    // brandId → list of SSE emitters (one per open browser tab)
    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

    /**
     * Subscribe a client to SSE events for a specific brand.
     * Returns a SseEmitter that should be returned from the controller.
     */
    public SseEmitter subscribe(UUID brandId) {
        // -1L = no timeout; the browser will reconnect automatically on network drops
        SseEmitter emitter = new SseEmitter(-1L);

        emitters.computeIfAbsent(brandId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.info("[SSE] Client subscribed for brandId={}, total subscribers={}", brandId,
                emitters.getOrDefault(brandId, List.of()).size());

        // Send a connected ping immediately
        try {
            emitter.send(SseEmitter.event().name("connected").data("OK"));
        } catch (IOException e) {
            log.warn("[SSE] Failed to send initial ping for brandId={}", brandId);
        }

        // Cleanup on completion / timeout / error
        Runnable cleanup = () -> {
            List<SseEmitter> list = emitters.get(brandId);
            if (list != null) {
                list.remove(emitter);
                log.info("[SSE] Client disconnected for brandId={}, remaining={}", brandId, list.size());
            }
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        return emitter;
    }

    /**
     * Broadcast a new inbox message to all subscribers of the given brand.
     */
    public void publishNewMessage(UUID brandId, InboxMessageResponse message) {
        List<SseEmitter> brandEmitters = emitters.getOrDefault(brandId, List.of());
        log.info("[SSE] publishNewMessage brandId={} subscribers={} msgId={}", brandId, brandEmitters.size(), message.getId());
        if (brandEmitters.isEmpty()) {
            log.warn("[SSE] No subscribers for brandId={} — message will not be pushed in realtime. All active brandIds: {}", brandId, emitters.keySet());
            return;
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            log.error("[SSE] Failed to serialize message", e);
            return;
        }

        List<SseEmitter> dead = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : brandEmitters) {
            try {
                emitter.send(SseEmitter.event().name("new_message").data(json));
                log.debug("[SSE] Broadcasted message {} to brandId={}", message.getId(), brandId);
            } catch (IOException e) {
                log.warn("[SSE] Dead emitter for brandId={}, removing", brandId);
                dead.add(emitter);
            }
        }
        brandEmitters.removeAll(dead);
    }

    /**
     * Sends a comment heartbeat to all connected clients every 30 seconds.
     * This prevents proxies (Traefik, Nginx) from buffering the SSE stream
     * and keeps the connection alive through idle-timeout firewalls.
     */
    @Scheduled(fixedDelay = 30000)
    public void sendHeartbeats() {
        if (emitters.isEmpty()) return;
        for (Map.Entry<UUID, List<SseEmitter>> entry : emitters.entrySet()) {
            List<SseEmitter> dead = new CopyOnWriteArrayList<>();
            for (SseEmitter emitter : entry.getValue()) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (IOException e) {
                    dead.add(emitter);
                }
            }
            if (!dead.isEmpty()) {
                entry.getValue().removeAll(dead);
                log.debug("[SSE] Removed {} dead emitters during heartbeat for brandId={}", dead.size(), entry.getKey());
            }
        }
    }
}
