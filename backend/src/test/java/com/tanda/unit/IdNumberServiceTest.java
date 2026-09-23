package com.tanda.unit;

import com.tanda.repository.UserRepository;
import com.tanda.service.IdNumberService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IdNumberServiceTest {

    @Mock
    private UserRepository userRepository;

    private IdNumberService idNumberService;

    @BeforeEach
    void setUp() {
        idNumberService = new IdNumberService(userRepository);
    }

    @Test
    @DisplayName("formatIdNumber() formats numbers correctly into 8 digits with space (XXXX XXXX)")
    void formatIdNumberFormatsCorrectly() {
        assertEquals("0000 0001", idNumberService.formatIdNumber(1));
        assertEquals("0000 5001", idNumberService.formatIdNumber(5001));
        assertEquals("0014 9283", idNumberService.formatIdNumber(149283));
        assertEquals("9999 9999", idNumberService.formatIdNumber(99999999));
    }

    @Test
    @DisplayName("isReservedVanityId() detects vanity and reserved patterns correctly")
    void detectsVanityPatterns() {
        // Rule 1: All 8 digits identical
        assertTrue(idNumberService.isReservedVanityId(11111111L));
        assertTrue(idNumberService.isReservedVanityId(77777777L));
        assertTrue(idNumberService.isReservedVanityId(99999999L));

        // Rule 2: Sequential ascending or descending
        assertTrue(idNumberService.isReservedVanityId(12345678L));
        assertTrue(idNumberService.isReservedVanityId(87654321L));

        // Rule 3: First 4 digits identical AND last 4 digits identical (XXXX YYYY)
        assertTrue(idNumberService.isReservedVanityId(1111L));     // 0000 1111
        assertTrue(idNumberService.isReservedVanityId(55552222L)); // 5555 2222
        assertTrue(idNumberService.isReservedVanityId(77770000L)); // 7777 0000
        assertTrue(idNumberService.isReservedVanityId(99998888L)); // 9999 8888

        // Allowed patterns:
        assertFalse(idNumberService.isReservedVanityId(11771177L));
        assertFalse(idNumberService.isReservedVanityId(12121212L));
        assertFalse(idNumberService.isReservedVanityId(58291042L));
        assertFalse(idNumberService.isReservedVanityId(5001L));     // 0000 5001
        assertFalse(idNumberService.isReservedVanityId(149283L));   // 0014 9283
    }

    @Test
    @DisplayName("generateUniqueReaderId() generates valid, non-reserved 8-digit ID >= 5001")
    void generatesUniqueReaderIdCorrectly() {
        when(userRepository.existsByIdNumber(anyString())).thenReturn(false);

        for (int i = 0; i < 50; i++) {
            String id = idNumberService.generateUniqueReaderId();
            assertNotNull(id);
            assertTrue(id.matches("^\\d{4} \\d{4}$"), "ID must match 'XXXX XXXX' format: " + id);

            long num = Long.parseLong(id.replace(" ", ""));
            assertTrue(num >= 5001L, "Generated ID must be >= 5001: " + num);
            assertTrue(num <= 99999999L, "Generated ID must be <= 99999999: " + num);
            assertFalse(idNumberService.isReservedVanityId(num), "Generated ID must not be a vanity ID: " + id);
        }
    }
}
