package com.tanda.unit;

import com.tanda.dto.bonus.AdjustBonusRequestDto;
import com.tanda.dto.bonus.BonusPurchaseSubscriptionRequestDto;
import com.tanda.dto.bonus.BonusSettingsDto;
import com.tanda.dto.bonus.UpdateBonusSettingsRequestDto;
import com.tanda.dto.system.SystemSettingsResponseDto;
import com.tanda.entity.BonusTransaction;
import com.tanda.entity.SystemSetting;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.repository.BonusTransactionRepository;
import com.tanda.repository.SystemSettingRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.BonusService;
import com.tanda.service.PremiumService;
import com.tanda.service.SystemSettingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BonusServiceTest {

    @Mock
    private BonusTransactionRepository bonusTransactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SystemSettingRepository systemSettingRepository;

    @Mock
    private SystemSettingService systemSettingService;

    @Mock
    private PremiumService premiumService;

    private BonusService bonusService;

    @BeforeEach
    void setUp() {
        bonusService = new BonusService(
                bonusTransactionRepository,
                userRepository,
                systemSettingRepository,
                systemSettingService,
                premiumService
        );
    }

    @Test
    @DisplayName("awardSignupBonus awards default 100 bonuses to newly registered user")
    void awardSignupBonus_success() {
        User user = User.builder()
                .id("u-1")
                .email("test@tanda.kz")
                .bonusBalance(0)
                .build();

        when(systemSettingRepository.findAll()).thenReturn(List.of(
                SystemSetting.builder().settingKey("bonus_system_enabled").settingValue("true").build(),
                SystemSetting.builder().settingKey("bonus_signup_enabled").settingValue("true").build(),
                SystemSetting.builder().settingKey("bonus_signup_amount").settingValue("100").build()
        ));

        bonusService.awardSignupBonus(user);

        assertThat(user.getBonusBalance()).isEqualTo(100);
        verify(userRepository).save(user);
        verify(bonusTransactionRepository).save(any(BonusTransaction.class));
    }

    @Test
    @DisplayName("checkAndAwardDailyBonus awards daily bonus once per day")
    void checkAndAwardDailyBonus_oncePerDay() {
        User user = User.builder()
                .id("u-1")
                .email("test@tanda.kz")
                .bonusBalance(50)
                .lastDailyBonusAt(null)
                .build();

        when(systemSettingRepository.findAll()).thenReturn(List.of(
                SystemSetting.builder().settingKey("bonus_system_enabled").settingValue("true").build(),
                SystemSetting.builder().settingKey("bonus_daily_login_enabled").settingValue("true").build(),
                SystemSetting.builder().settingKey("bonus_daily_login_amount").settingValue("10").build()
        ));

        boolean firstCall = bonusService.checkAndAwardDailyBonus(user);
        assertThat(firstCall).isTrue();
        assertThat(user.getBonusBalance()).isEqualTo(60);
        assertThat(user.getLastDailyBonusAt()).isEqualTo(LocalDate.now(ZoneId.of("Asia/Almaty")));

        // Second call on the same day should return false and not add bonuses
        boolean secondCall = bonusService.checkAndAwardDailyBonus(user);
        assertThat(secondCall).isFalse();
        assertThat(user.getBonusBalance()).isEqualTo(60);
    }

    @Test
    @DisplayName("processListeningDelta awards bonus when cumulative 1 hour threshold is crossed")
    void processListeningDelta_milestoneBonus() {
        User user = User.builder()
                .id("u-1")
                .bonusBalance(0)
                .totalListenedSeconds(3500L) // 3500s = 58.3 min
                .build();

        when(userRepository.findById("u-1")).thenReturn(Optional.of(user));
        when(systemSettingRepository.findAll()).thenReturn(List.of(
                SystemSetting.builder().settingKey("bonus_system_enabled").settingValue("true").build(),
                SystemSetting.builder().settingKey("bonus_listening_enabled").settingValue("true").build(),
                SystemSetting.builder().settingKey("bonus_listening_amount").settingValue("60").build(),
                SystemSetting.builder().settingKey("bonus_listening_interval_hours").settingValue("1").build()
        ));

        // Adding 200 seconds -> total reaches 3700 seconds (crosses 3600s = 1h milestone)
        bonusService.processListeningDelta("u-1", 200);

        assertThat(user.getTotalListenedSeconds()).isEqualTo(3700L);
        assertThat(user.getBonusBalance()).isEqualTo(60);
        verify(bonusTransactionRepository).save(any(BonusTransaction.class));
    }

    @Test
    @DisplayName("purchaseSubscriptionWithBonus succeeds and grants premium when balance is sufficient")
    void purchaseSubscriptionWithBonus_success() {
        User user = User.builder()
                .id("u-1")
                .bonusBalance(2000)
                .build();

        when(userRepository.findById("u-1")).thenReturn(Optional.of(user));
        when(systemSettingRepository.findAll()).thenReturn(List.of(
                SystemSetting.builder().settingKey("bonus_system_enabled").settingValue("true").build(),
                SystemSetting.builder().settingKey("bonus_currency_name").settingValue("Бонус").build()
        ));
        when(systemSettingService.getSettings()).thenReturn(SystemSettingsResponseDto.builder()
                .price1Month(1490)
                .build());

        BonusPurchaseSubscriptionRequestDto request = BonusPurchaseSubscriptionRequestDto.builder()
                .planName("1_month")
                .planDays(30)
                .amount(1490)
                .build();

        bonusService.purchaseSubscriptionWithBonus("u-1", request);

        assertThat(user.getBonusBalance()).isEqualTo(510);
        verify(bonusTransactionRepository).save(any(BonusTransaction.class));
        verify(premiumService).grantPremium(eq("u-1"), eq(30), eq("BONUS_PURCHASE"), eq("USER_BONUS"));
    }

    @Test
    @DisplayName("purchaseSubscriptionWithBonus throws BadRequestException if balance is insufficient")
    void purchaseSubscriptionWithBonus_insufficientBalance() {
        User user = User.builder()
                .id("u-1")
                .bonusBalance(500)
                .build();

        when(userRepository.findById("u-1")).thenReturn(Optional.of(user));
        when(systemSettingRepository.findAll()).thenReturn(List.of(
                SystemSetting.builder().settingKey("bonus_system_enabled").settingValue("true").build(),
                SystemSetting.builder().settingKey("bonus_currency_name").settingValue("Бонус").build()
        ));
        when(systemSettingService.getSettings()).thenReturn(SystemSettingsResponseDto.builder()
                .price1Month(1490)
                .build());

        BonusPurchaseSubscriptionRequestDto request = BonusPurchaseSubscriptionRequestDto.builder()
                .planName("1_month")
                .planDays(30)
                .amount(1490)
                .build();

        assertThatThrownBy(() -> bonusService.purchaseSubscriptionWithBonus("u-1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Бонус балансыңыз жеткіліксіз");

        verifyNoInteractions(premiumService);
    }
}
