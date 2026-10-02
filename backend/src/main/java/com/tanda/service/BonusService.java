package com.tanda.service;

import com.tanda.dto.bonus.AdjustBonusRequestDto;
import com.tanda.dto.bonus.BonusPurchaseSubscriptionRequestDto;
import com.tanda.dto.bonus.BonusSettingsDto;
import com.tanda.dto.bonus.BonusStatsSummaryResponseDto;
import com.tanda.dto.bonus.BonusTransactionResponseDto;
import com.tanda.dto.bonus.UpdateBonusSettingsRequestDto;
import com.tanda.dto.system.SystemSettingsResponseDto;
import com.tanda.dto.user.UserListResponseDto;
import com.tanda.dto.user.UserResponseDto;
import com.tanda.entity.BonusTransaction;
import com.tanda.entity.SystemSetting;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.BonusTransactionRepository;
import com.tanda.repository.SystemSettingRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BonusService {

    public static final ZoneId KZ_ZONE = ZoneId.of("Asia/Almaty");

    private final BonusTransactionRepository bonusTransactionRepository;
    private final UserRepository userRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final SystemSettingService systemSettingService;
    private final PremiumService premiumService;
    private final UserService userService;

    @Transactional(readOnly = true)
    public BonusSettingsDto getBonusSettings() {
        Map<String, String> map = getSettingsMap();
        return BonusSettingsDto.builder()
                .bonusSystemEnabled(!"false".equalsIgnoreCase(map.getOrDefault("bonus_system_enabled", "true")))
                .bonusCurrencyName(map.getOrDefault("bonus_currency_name", "Бонус"))
                .bonusSignupEnabled(!"false".equalsIgnoreCase(map.getOrDefault("bonus_signup_enabled", "true")))
                .bonusSignupAmount(parseIntOrDefault(map.get("bonus_signup_amount"), 100))
                .bonusDailyLoginEnabled(!"false".equalsIgnoreCase(map.getOrDefault("bonus_daily_login_enabled", "true")))
                .bonusDailyLoginAmount(parseIntOrDefault(map.get("bonus_daily_login_amount"), 10))
                .bonusListeningEnabled(!"false".equalsIgnoreCase(map.getOrDefault("bonus_listening_enabled", "true")))
                .bonusListeningAmount(parseIntOrDefault(map.get("bonus_listening_amount"), 60))
                .bonusListeningIntervalHours(parseIntOrDefault(map.get("bonus_listening_interval_hours"), 1))
                .bonusReviewEnabled(!"false".equalsIgnoreCase(map.getOrDefault("bonus_review_enabled", "true")))
                .bonusReviewAmount(parseIntOrDefault(map.get("bonus_review_amount"), 5))
                .build();
    }

    @Transactional
    public BonusSettingsDto updateBonusSettings(UpdateBonusSettingsRequestDto dto) {
        if (dto.getBonusSystemEnabled() != null) {
            saveSetting("bonus_system_enabled", String.valueOf(dto.getBonusSystemEnabled()));
        }
        if (dto.getBonusCurrencyName() != null && !dto.getBonusCurrencyName().isBlank()) {
            saveSetting("bonus_currency_name", dto.getBonusCurrencyName().trim());
        }
        if (dto.getBonusSignupEnabled() != null) {
            saveSetting("bonus_signup_enabled", String.valueOf(dto.getBonusSignupEnabled()));
        }
        if (dto.getBonusSignupAmount() != null) {
            saveSetting("bonus_signup_amount", String.valueOf(Math.max(0, dto.getBonusSignupAmount())));
        }
        if (dto.getBonusDailyLoginEnabled() != null) {
            saveSetting("bonus_daily_login_enabled", String.valueOf(dto.getBonusDailyLoginEnabled()));
        }
        if (dto.getBonusDailyLoginAmount() != null) {
            saveSetting("bonus_daily_login_amount", String.valueOf(Math.max(0, dto.getBonusDailyLoginAmount())));
        }
        if (dto.getBonusListeningEnabled() != null) {
            saveSetting("bonus_listening_enabled", String.valueOf(dto.getBonusListeningEnabled()));
        }
        if (dto.getBonusListeningAmount() != null) {
            saveSetting("bonus_listening_amount", String.valueOf(Math.max(0, dto.getBonusListeningAmount())));
        }
        if (dto.getBonusListeningIntervalHours() != null) {
            saveSetting("bonus_listening_interval_hours", String.valueOf(Math.max(1, dto.getBonusListeningIntervalHours())));
        }
        if (dto.getBonusReviewEnabled() != null) {
            saveSetting("bonus_review_enabled", String.valueOf(dto.getBonusReviewEnabled()));
        }
        if (dto.getBonusReviewAmount() != null) {
            saveSetting("bonus_review_amount", String.valueOf(Math.max(0, dto.getBonusReviewAmount())));
        }

        log.info("Bonus settings updated successfully");
        return getBonusSettings();
    }

    public boolean isClientReader(User user) {
        if (user == null) return false;
        if (user.getDuty() != null && !user.getDuty().isBlank()) return false;
        String role = user.getRole();
        return role == null || "client".equalsIgnoreCase(role) || "reader".equalsIgnoreCase(role);
    }

    @Transactional
    public void awardSignupBonus(User user) {
        if (!isClientReader(user)) return;
        BonusSettingsDto settings = getBonusSettings();
        if (!settings.isBonusSystemEnabled() || !settings.isBonusSignupEnabled() || settings.getBonusSignupAmount() <= 0) {
            return;
        }

        int amount = settings.getBonusSignupAmount();
        int current = user.getBonusBalance() != null ? user.getBonusBalance() : 0;
        user.setBonusBalance(current + amount);
        userRepository.save(user);

        BonusTransaction tx = BonusTransaction.builder()
                .id("btx-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(user.getId())
                .amount(amount)
                .type("SIGNUP")
                .description("Тіркелгені үшін берілген бонус")
                .createdAt(OffsetDateTime.now())
                .build();
        bonusTransactionRepository.save(tx);

        log.info("Awarded signup bonus {} to user {} ({})", amount, user.getId(), user.getEmail());
    }

    @Transactional
    public boolean checkAndAwardDailyBonus(User user) {
        if (!isClientReader(user) || user.getId() == null) return false;
        BonusSettingsDto settings = getBonusSettings();
        if (!settings.isBonusSystemEnabled() || !settings.isBonusDailyLoginEnabled() || settings.getBonusDailyLoginAmount() <= 0) {
            return false;
        }

        LocalDate today = LocalDate.now(KZ_ZONE);
        if (user.getLastDailyBonusAt() != null && !user.getLastDailyBonusAt().isBefore(today)) {
            return false; // Already received today's bonus
        }

        int amount = settings.getBonusDailyLoginAmount();
        int current = user.getBonusBalance() != null ? user.getBonusBalance() : 0;
        user.setBonusBalance(current + amount);
        user.setLastDailyBonusAt(today);
        userRepository.save(user);

        BonusTransaction tx = BonusTransaction.builder()
                .id("btx-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(user.getId())
                .amount(amount)
                .type("DAILY_LOGIN")
                .description("Күндік кіру белсенділігі үшін бонус")
                .createdAt(OffsetDateTime.now())
                .build();
        bonusTransactionRepository.save(tx);

        log.info("Awarded daily login bonus {} to user {} for date {}", amount, user.getId(), today);
        return true;
    }

    @Transactional
    public void processListeningDelta(String userId, int allowedSeconds) {
        if (userId == null || allowedSeconds <= 0) return;
        User user = userRepository.findById(userId).orElse(null);
        if (!isClientReader(user)) return;

        long oldSeconds = user.getTotalListenedSeconds() != null ? user.getTotalListenedSeconds() : 0L;
        long newSeconds = oldSeconds + allowedSeconds;
        user.setTotalListenedSeconds(newSeconds);

        BonusSettingsDto settings = getBonusSettings();
        if (settings.isBonusSystemEnabled() && settings.isBonusListeningEnabled() && settings.getBonusListeningAmount() > 0) {
            long intervalSeconds = Math.max(1, settings.getBonusListeningIntervalHours()) * 3600L;
            long oldMilestones = oldSeconds / intervalSeconds;
            long newMilestones = newSeconds / intervalSeconds;

            if (newMilestones > oldMilestones) {
                long completedHours = newMilestones - oldMilestones;
                int amount = (int) (completedHours * settings.getBonusListeningAmount());
                int current = user.getBonusBalance() != null ? user.getBonusBalance() : 0;
                user.setBonusBalance(current + amount);

                BonusTransaction tx = BonusTransaction.builder()
                        .id("btx-" + UUID.randomUUID().toString().substring(0, 8))
                        .userId(user.getId())
                        .amount(amount)
                        .type("LISTENING_MILESTONE")
                        .description(completedHours + " сағат аудио тыңдағаны үшін бонус")
                        .createdAt(OffsetDateTime.now())
                        .build();
                bonusTransactionRepository.save(tx);

                log.info("Awarded listening bonus {} ({} milestones) to user {}", amount, completedHours, userId);
            }
        }

        userRepository.save(user);
    }

    @Transactional
    public void awardReviewBonus(String userId, String bookId, String bookTitle) {
        if (userId == null) return;
        BonusSettingsDto settings = getBonusSettings();
        if (!settings.isBonusSystemEnabled() || !settings.isBonusReviewEnabled() || settings.getBonusReviewAmount() <= 0) {
            return;
        }

        User user = userRepository.findById(userId).orElse(null);
        if (!isClientReader(user)) return;

        int amount = settings.getBonusReviewAmount();
        int current = user.getBonusBalance() != null ? user.getBonusBalance() : 0;
        user.setBonusBalance(current + amount);
        userRepository.save(user);

        String desc = bookTitle != null ? "«" + bookTitle + "» кітабына пікір қалдырғаны үшін бонус" : "Кітапқа пікір жазғаны үшін бонус";
        BonusTransaction tx = BonusTransaction.builder()
                .id("btx-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(user.getId())
                .amount(amount)
                .type("REVIEW")
                .description(desc)
                .createdAt(OffsetDateTime.now())
                .build();
        bonusTransactionRepository.save(tx);

        log.info("Awarded review bonus {} to user {} for book {}", amount, userId, bookId);
    }

    @Transactional
    public void purchaseSubscriptionWithBonus(String userId, BonusPurchaseSubscriptionRequestDto dto) {
        BonusSettingsDto bonusSettings = getBonusSettings();
        if (!bonusSettings.isBonusSystemEnabled()) {
            throw new BadRequestException("Бонус жүйесі қазіргі уақытта өшірілген");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + userId));

        int userBalance = user.getBonusBalance() != null ? user.getBonusBalance() : 0;

        // Determine required price
        SystemSettingsResponseDto sysSettings = systemSettingService.getSettings();
        int requiredPrice;
        int planDays = dto.getPlanDays();

        if (dto.getPlanName().contains("1_year") || dto.getPlanName().contains("year") || planDays >= 365) {
            requiredPrice = sysSettings.getPrice1Year();
            planDays = 365;
        } else if (dto.getPlanName().contains("3_months") || planDays >= 90) {
            requiredPrice = sysSettings.getPrice3Months();
            planDays = 90;
        } else {
            requiredPrice = sysSettings.getPrice1Month();
            planDays = 30;
        }

        if (userBalance < requiredPrice) {
            throw new BadRequestException("Бонус балансыңыз жеткіліксіз. Қажет: " + requiredPrice + " " + bonusSettings.getBonusCurrencyName() + ", сізде: " + userBalance);
        }

        // Deduct bonus
        user.setBonusBalance(userBalance - requiredPrice);
        userRepository.save(user);

        // Record spending transaction
        BonusTransaction tx = BonusTransaction.builder()
                .id("btx-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(user.getId())
                .amount(-requiredPrice)
                .type("SUBSCRIPTION_PURCHASE")
                .description("Премиум жазылымды бонуспен сатып алу (" + planDays + " күн)")
                .createdAt(OffsetDateTime.now())
                .build();
        bonusTransactionRepository.save(tx);

        // Grant Premium
        premiumService.grantPremium(userId, planDays, "BONUS_PURCHASE", "USER_BONUS");

        log.info("User {} successfully purchased Premium ({} days) with {} bonuses", userId, planDays, requiredPrice);
    }

    @Transactional(readOnly = true)
    public Page<BonusTransactionResponseDto> getUserTransactions(String userId, Pageable pageable) {
        User user = userRepository.findById(userId).orElse(null);
        return bonusTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(tx -> toTransactionDto(tx, user));
    }

    @Transactional(readOnly = true)
    public Page<BonusTransactionResponseDto> getAllTransactionsAdmin(String search, String type, Pageable pageable) {
        String cleanType = (type != null && !type.isBlank() && !type.equalsIgnoreCase("ALL")) ? type.trim().toUpperCase() : null;
        Page<BonusTransaction> page = (cleanType != null)
                ? bonusTransactionRepository.findByTypeFiltered(cleanType, pageable)
                : bonusTransactionRepository.findAllByOrderByCreatedAtDesc(pageable);

        // Fetch users in batch to avoid N+1
        List<String> userIds = page.getContent().stream().map(BonusTransaction::getUserId).distinct().collect(Collectors.toList());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return page.map(tx -> toTransactionDto(tx, userMap.get(tx.getUserId())));
    }

    @Transactional(readOnly = true)
    public BonusStatsSummaryResponseDto getBonusStatsSummaryAdmin() {
        long totalEarned = bonusTransactionRepository.sumTotalEarned();
        long totalSpent = bonusTransactionRepository.sumTotalSpent();
        long inCirculation = totalEarned - totalSpent;
        long totalTxCount = bonusTransactionRepository.count();

        long usersWithBonuses = userRepository.findAll().stream()
                .filter(this::isClientReader)
                .filter(u -> u.getBonusBalance() != null && u.getBonusBalance() > 0)
                .count();

        return BonusStatsSummaryResponseDto.builder()
                .totalBonusesEarned(totalEarned)
                .totalBonusesSpent(totalSpent)
                .totalActiveBonusesInCirculation(Math.max(0, inCirculation))
                .totalUsersWithBonuses(usersWithBonuses)
                .totalTransactionsCount(totalTxCount)
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponseDto lookupUserForAdmin(String query) {
        if (query == null || query.trim().isEmpty()) {
            throw new BadRequestException("Іздеу мәні бос болмауы керек");
        }
        User user = findUserFlexibly(query.trim());
        if (user == null) {
            throw new ResourceNotFoundException("Оқырман табылмады: " + query);
        }
        if (!isClientReader(user)) {
            throw new BadRequestException("Бұл қолданушы оқырман емес (автор немесе әкімші/көмекші). Бонус тек оқырмандарға ғана беріледі.");
        }
        return userService.getUserById(user.getId());
    }

    @Transactional(readOnly = true)
    public Page<UserListResponseDto> getBonusReadersAdmin(String search, String sortBy, int page, int size) {
        List<User> users = userRepository.findAll().stream()
                .filter(this::isClientReader)
                .filter(u -> u.getBonusBalance() != null && u.getBonusBalance() > 0)
                .collect(Collectors.toList());

        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            String qDigits = search.replaceAll("[^0-9]", "");
            users = users.stream().filter(u -> {
                if (u.getName() != null && u.getName().toLowerCase().contains(q)) return true;
                if (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)) return true;
                if (u.getUsername() != null && u.getUsername().toLowerCase().contains(q.replace("@", ""))) return true;
                if (u.getIdNumber() != null) {
                    if (u.getIdNumber().toLowerCase().contains(q)) return true;
                    if (!qDigits.isEmpty() && u.getIdNumber().replaceAll("[^0-9]", "").contains(qDigits)) return true;
                }
                if (u.getId() != null && u.getId().toLowerCase().contains(q)) return true;
                return false;
            }).collect(Collectors.toList());
        }

        Comparator<User> comparator;
        if ("bonus_asc".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparingInt(u -> (u.getBonusBalance() != null ? u.getBonusBalance() : 0));
        } else if ("newest".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
        } else if ("oldest".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));
        } else {
            comparator = Comparator.<User>comparingInt(u -> (u.getBonusBalance() != null ? u.getBonusBalance() : 0)).reversed()
                    .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
        }
        users.sort(comparator);

        int total = users.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<User> pagedUsers = users.subList(fromIndex, toIndex);

        List<UserListResponseDto> dtos = pagedUsers.stream().map(u -> {
            boolean isClient = u.getRole() == null || "client".equalsIgnoreCase(u.getRole()) || "reader".equalsIgnoreCase(u.getRole());
            return UserListResponseDto.builder()
                    .id(u.getId())
                    .idNumber(u.getIdNumber())
                    .name(u.getName())
                    .email(u.getEmail())
                    .role(u.getRole())
                    .isActive(u.getIsActive())
                    .createdAt(u.getCreatedAt())
                    .phone(u.getPhone())
                    .username(isClient ? u.getUsername() : null)
                    .avatarUrl(u.getAvatarUrl())
                    .isBlocked(u.getIsBlocked())
                    .bonusBalance(u.getBonusBalance() != null ? u.getBonusBalance() : 0)
                    .build();
        }).collect(Collectors.toList());

        return new PageImpl<>(dtos, PageRequest.of(page, size), total);
    }

    @Transactional(readOnly = true)
    public Page<BonusTransactionResponseDto> getUserTransactionsAdmin(String userId, Pageable pageable) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + userId));
        Page<BonusTransaction> txs = bonusTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return txs.map(tx -> toTransactionDto(tx, user));
    }

    public User findUserFlexibly(String query) {
        if (query == null) return null;
        String clean = query.trim();
        if (clean.isEmpty()) return null;

        // 1. By ID (UUID)
        Optional<User> byId = userRepository.findById(clean);
        if (byId.isPresent()) return byId.get();

        // 2. By ID Number exactly (e.g. "9870 0979")
        Optional<User> byIdNum = userRepository.findByIdNumber(clean);
        if (byIdNum.isPresent()) return byIdNum.get();

        // 2b. By formatted / unformatted ID Number
        String digitsOnly = clean.replaceAll("[^0-9]", "");
        if (digitsOnly.length() == 8) {
            String formattedId = digitsOnly.substring(0, 4) + " " + digitsOnly.substring(4);
            Optional<User> byFormatted = userRepository.findByIdNumber(formattedId);
            if (byFormatted.isPresent()) return byFormatted.get();
        }

        // 3. By Email
        Optional<User> byEmail = userRepository.findByEmail(clean);
        if (byEmail.isPresent()) return byEmail.get();

        // 4. By Username
        String cleanUsername = clean.startsWith("@") ? clean.substring(1) : clean;
        Optional<User> byUsername = userRepository.findByUsernameIgnoreCase(cleanUsername);
        if (byUsername.isPresent()) return byUsername.get();

        return null;
    }

    @Transactional
    public void adjustUserBonusAdmin(String userIdOrQuery, AdjustBonusRequestDto dto) {
        User user = findUserFlexibly(userIdOrQuery);
        if (user == null) {
            throw new ResourceNotFoundException("Оқырман табылмады: " + userIdOrQuery);
        }
        if (!isClientReader(user)) {
            throw new BadRequestException("Бұл қолданушы оқырман емес (автор немесе әкімші/көмекші). Бонус тек оқырмандарға ғана беріледі.");
        }

        int amount = dto.getAmount();
        int current = user.getBonusBalance() != null ? user.getBonusBalance() : 0;
        int newBalance = Math.max(0, current + amount);
        user.setBonusBalance(newBalance);
        userRepository.save(user);

        String desc = (dto.getReason() != null && !dto.getReason().isBlank())
                ? "Әкімші түзетуі: " + dto.getReason().trim()
                : "Әкімші бонусты қолмен өзгертті";

        BonusTransaction tx = BonusTransaction.builder()
                .id("btx-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(user.getId())
                .amount(amount)
                .type("ADMIN_ADJUSTMENT")
                .description(desc)
                .createdAt(OffsetDateTime.now())
                .build();
        bonusTransactionRepository.save(tx);

        log.info("Admin adjusted bonus for user {} by {} (new balance: {})", user.getId(), amount, newBalance);
    }

    private BonusTransactionResponseDto toTransactionDto(BonusTransaction tx, User user) {
        return BonusTransactionResponseDto.builder()
                .id(tx.getId())
                .userId(tx.getUserId())
                .userName(user != null ? user.getName() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .userUsername(user != null ? user.getUsername() : null)
                .userIdNumber(user != null ? user.getIdNumber() : null)
                .amount(tx.getAmount())
                .type(tx.getType())
                .description(tx.getDescription())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    private Map<String, String> getSettingsMap() {
        List<SystemSetting> list = systemSettingRepository.findAll();
        Map<String, String> map = new HashMap<>();
        for (SystemSetting s : list) {
            map.put(s.getSettingKey(), s.getSettingValue());
        }
        return map;
    }

    private void saveSetting(String key, String value) {
        SystemSetting s = systemSettingRepository.findBySettingKey(key)
                .orElseGet(() -> SystemSetting.builder().settingKey(key).build());
        s.setSettingValue(value);
        s.setUpdatedAt(OffsetDateTime.now());
        systemSettingRepository.save(s);
    }

    private int parseIntOrDefault(String value, int fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
