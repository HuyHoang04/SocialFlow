package com.socialflow.security;

import com.socialflow.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        String path = request.getRequestURI();

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtil.validateToken(token)) {
                UUID userId = jwtUtil.getUserIdFromToken(token);
                userRepository.findById(userId).ifPresentOrElse(user -> {
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }, () -> {
                    log.warn("JWT valid but user not found: {} for {}", userId, path);
                });
            } else {
                log.warn("JWT invalid/expired for {}", path);
            }
        } else {
            if (!path.contains("/auth/") && !path.contains("/callback") 
                    && !path.contains("/webhook") && !path.contains("/media/")
                    && !path.contains("/actuator") && !path.contains("/api/ai/")) {
                log.warn("No Authorization header for protected endpoint: {} {}", request.getMethod(), path);
            }
        }
        filterChain.doFilter(request, response);
    }
}
