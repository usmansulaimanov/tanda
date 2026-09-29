package com.tanda.unit;

import com.tanda.dto.premium.PremiumEntitlementResponseDto;
import com.tanda.entity.PremiumEntitlement;
import com.tanda.entity.User;
import com.tanda.repository.BirthdayGiftRepository;
import com.tanda.repository.PremiumEntitlementRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.MessageService;
import com.tanda.service.PremiumService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PremiumServiceTest {

    @Mock
    private PremiumEntitlementRepository entitlementRepository;

    @Mock
    private BirthdayGiftRepository birthdayGiftRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MessageService messageService;

    @InjectMocks
    private PremiumService premiumService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-123")
                .name("Тест Оқырман")
                .email("reader@tanda.kz")
                .role("client")
                .build();
    }

    @Test
    @DisplayName("grantPremium creates an active entitlement for specified days")
    void testGrantPremium() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(entitlementRepository.findTopByUserIdAndIsActiveTrueAndExpiresAtAfterOrderByExpiresAtDesc(eq("user-123"), any()))
                .thenReturn(Optional.empty());

        when(entitlementRepository.save(any(PremiumEntitlement.class))).thenAnswer(invocation -> {
            PremiumEntitlement ent = invocation.getArgument(0);
            ent.setId("prem-test-1");
            return ent;
        });

        PremiumEntitlementResponseDto result = premiumService.grantPremium("user-123", 30, "MANUAL_ADMIN", "admin-1");

        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo("user-123");
        assertThat(result.getSource()).isEqualTo("MANUAL_ADMIN");
        assertThat(result.getGrantedBy()).isEqualTo("admin-1");
        assertThat(result.getIsActive()).isTrue();
        assertThat(result.getExpiresAt()).isAfter(OffsetDateTime.now().plusDays(29));
    }

    @Test
    @DisplayName("revokePremium sets isActive=false and expiresAt to now")
    void testRevokePremium() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));

        OffsetDateTime future = OffsetDateTime.now().plusDays(25);
        PremiumEntitlement activeEnt = PremiumEntitlement.builder()
                .id("prem-1")
                .userId("user-123")
                .source("MANUAL_ADMIN")
                .startsAt(OffsetDateTime.now().minusDays(5))
                .expiresAt(future)
                .isActive(true)
                .build();

        when(entitlementRepository.findByUserIdAndIsActiveTrueOrderByExpiresAtDesc("user-123"))
                .thenReturn(List.of(activeEnt));

        premiumService.revokePremium("user-123", "ADMIN_CANCEL", "admin-1");

        ArgumentCaptor<PremiumEntitlement> captor = ArgumentCaptor.forClass(PremiumEntitlement.class);
        verify(entitlementRepository).save(captor.capture());

        PremiumEntitlement saved = captor.getValue();
        assertThat(saved.getIsActive()).isFalse();
        assertThat(saved.getExpiresAt()).isBeforeOrEqualTo(OffsetDateTime.now());
    }
}
