package com.socialflow.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:86400000}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(UUID userId, String email) {
        return generateToken(userId, email, null);
    }

    public String generateToken(UUID userId, String email, Map<String, String> brandRoles) {
        var builder = Jwts.builder()
                .subject(email)
                .claim("userId", userId.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key);
        
        if (brandRoles != null && !brandRoles.isEmpty()) {
            builder.claim("brandRoles", brandRoles);
        }
        
        return builder.compact();
    }

    public String getEmailFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public UUID getUserIdFromToken(String token) {
        return UUID.fromString(getClaims(token).get("userId", String.class));
    }

    @SuppressWarnings("unchecked")
    public Map<String, String> getBrandRolesFromToken(String token) {
        Claims claims = getClaims(token);
        Object brandRolesObj = claims.get("brandRoles");
        if (brandRolesObj instanceof Map) {
            return (Map<String, String>) brandRolesObj;
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
