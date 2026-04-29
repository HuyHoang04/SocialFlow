package com.socialflow.controller;

import com.socialflow.ai.dto.ChatRequest;
import com.socialflow.ai.dto.ChatResponse;
import com.socialflow.ai.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@CrossOrigin
public class ChatController {

    private final AiChatService aiChatService;

    @PostMapping("/send")
    public ResponseEntity<ChatResponse> sendMessage(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(aiChatService.processChatMessage(request));
    }

    @PostMapping("/callback")
    public ResponseEntity<Void> handleCallback(@RequestBody ChatResponse response) {
        // This is called by Python when background processing is done
        aiChatService.handleAiCallback(response);
        return ResponseEntity.ok().build();
    }
}
