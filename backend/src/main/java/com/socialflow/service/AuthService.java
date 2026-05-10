package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.*;
import com.socialflow.model.User;
import com.socialflow.repository.UserRepository;
import com.socialflow.repository.BrandTeamMemberRepository;
import com.socialflow.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BrandTeamMemberRepository brandTeamMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    private Map<String, String> getBrandRolesForUser(User user) {
        Map<String, String> brandRoles = new HashMap<>();
        brandTeamMemberRepository.findByUserId(user.getId()).forEach(member -> 
            brandRoles.put(member.getBrand().getId().toString(), member.getRole().name())
        );
        return brandRoles;
    }

    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException(ErrorMessages.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        user = userRepository.save(user);
        Map<String, String> brandRoles = getBrandRolesForUser(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), brandRoles);
        return new LoginResponse(token, user.getEmail(), user.getName(), user.getId());
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException(ErrorMessages.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException(ErrorMessages.INVALID_CREDENTIALS);
        }

        Map<String, String> brandRoles = getBrandRolesForUser(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), brandRoles);
        return new LoginResponse(token, user.getEmail(), user.getName(), user.getId());
    }
}
