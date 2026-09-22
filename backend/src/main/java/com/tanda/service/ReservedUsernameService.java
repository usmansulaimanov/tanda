package com.tanda.service;

import com.tanda.entity.ReservedUsername;
import com.tanda.exception.BadRequestException;
import com.tanda.repository.ReservedUsernameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservedUsernameService {

    private final ReservedUsernameRepository reservedUsernameRepository;
    private final com.tanda.repository.UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<String> getAllReservedUsernames() {
        return reservedUsernameRepository.findAll().stream()
                .map(ReservedUsername::getUsername)
                .sorted()
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean isReserved(String username) {
        if (username == null || username.isBlank()) {
            return false;
        }
        String clean = username.trim().toLowerCase().replaceAll("^@", "");
        return reservedUsernameRepository.existsByUsernameIgnoreCase(clean);
    }

    @Transactional
    public void addReservedUsername(String username, String createdBy) {
        if (username == null || username.isBlank()) {
            throw new BadRequestException("Юзернейм бос болмауы керек");
        }
        String clean = username.trim().toLowerCase().replaceAll("^@", "");
        if (clean.length() < 2) {
            throw new BadRequestException("Юзернейм кем дегенде 2 таңбадан тұруы керек");
        }
        if (reservedUsernameRepository.existsByUsernameIgnoreCase(clean)) {
            return; // already exists
        }

        String userId = null;
        if (createdBy != null && !createdBy.isBlank()) {
            userId = userRepository.findByEmail(createdBy.trim().toLowerCase())
                    .map(com.tanda.entity.User::getId)
                    .or(() -> userRepository.findById(createdBy.trim()).map(com.tanda.entity.User::getId))
                    .orElse(null);
        }

        ReservedUsername ru = ReservedUsername.builder()
                .username(clean)
                .createdBy(userId)
                .build();
        reservedUsernameRepository.save(ru);
        log.info("Reserved username added: {} by userId={}", clean, userId);
    }

    @Transactional
    public void removeReservedUsername(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        String clean = username.trim().toLowerCase().replaceAll("^@", "");
        reservedUsernameRepository.deleteByUsernameIgnoreCase(clean);
        log.info("Reserved username removed: {}", clean);
    }
}
