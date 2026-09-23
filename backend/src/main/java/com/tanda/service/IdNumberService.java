package com.tanda.service;

import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdNumberService {

    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public static final long MIN_READER_ID = 5001L;
    public static final long MAX_READER_ID = 99_999_999L;

    /**
     * Generates a unique, non-reserved 8-digit random ID number in "XXXX XXXX" format
     * for newly registered readers (between 0000 5001 and 9999 9999).
     */
    public synchronized String generateUniqueReaderId() {
        for (int attempts = 0; attempts < 10_000; attempts++) {
            long range = MAX_READER_ID - MIN_READER_ID + 1;
            long candidate = MIN_READER_ID + (Math.abs(secureRandom.nextLong()) % range);

            if (isReservedVanityId(candidate)) {
                continue;
            }

            String formatted = formatIdNumber(candidate);
            if (!userRepository.existsByIdNumber(formatted)) {
                return formatted;
            }
        }

        // Deterministic fallback in case of collision
        long fallback = MIN_READER_ID;
        while (userRepository.existsByIdNumber(formatIdNumber(fallback)) || isReservedVanityId(fallback)) {
            fallback++;
        }
        return formatIdNumber(fallback);
    }

    /**
     * Checks whether a number matches reserved vanity patterns:
     * 1) All 8 digits identical (e.g. 1111 1111, 7777 7777)
     * 2) Sequential ascending or descending (1234 5678, 8765 4321)
     * 3) First 4 digits all identical AND last 4 digits all identical (XXXX YYYY, e.g. 0000 1111, 5555 2222)
     */
    public boolean isReservedVanityId(long num) {
        String s = String.format("%08d", num);

        // Rule 1: All 8 digits identical
        if (s.matches("^(\\d)\\1{7}$")) {
            return true;
        }

        // Rule 2: Sequential ascending or descending
        if ("12345678".equals(s) || "87654321".equals(s)) {
            return true;
        }

        // Rule 3: First 4 digits identical AND last 4 digits identical (XXXX YYYY)
        if (s.matches("^(\\d)\\1{3}(\\d)\\2{3}$")) {
            return true;
        }

        return false;
    }

    /**
     * Formats a long number into 8-digit "XXXX XXXX" representation.
     */
    public String formatIdNumber(long num) {
        String str = String.format("%08d", num);
        return str.substring(0, 4) + " " + str.substring(4);
    }
}
