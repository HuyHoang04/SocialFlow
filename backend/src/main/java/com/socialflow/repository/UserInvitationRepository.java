package com.socialflow.repository;

import com.socialflow.model.UserInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserInvitationRepository extends JpaRepository<UserInvitation, UUID> {
    Optional<UserInvitation> findByToken(String token);
    List<UserInvitation> findByBrandId(UUID brandId);
    List<UserInvitation> findByEmailAndBrandId(String email, UUID brandId);
    List<UserInvitation> findByBrandIdAndAcceptedAtIsNull(UUID brandId);
}
