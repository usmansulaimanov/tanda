package com.tanda.service;

import com.tanda.dto.leaderboard.DailyActivityDto;
import com.tanda.dto.leaderboard.LeaderboardEntryDto;
import com.tanda.dto.leaderboard.LeaderboardPeriod;
import com.tanda.dto.leaderboard.LeaderboardResponseDto;
import com.tanda.dto.leaderboard.PersonalStatsResponseDto;
import com.tanda.entity.User;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LeaderboardService {

    private final AudioSessionRepository audioSessionRepository;
    private final UserRepository userRepository;

    public static final ZoneId KZ_ZONE = ZoneId.of("Asia/Almaty");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM");
    private static final DateTimeFormatter FULL_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    public LeaderboardResponseDto getLeaderboard(LeaderboardPeriod period, String currentUserId, boolean isAdmin) {
        if (period == null) {
            period = LeaderboardPeriod.THIS_WEEK;
        }

        LocalDate now = LocalDate.now(KZ_ZONE);
        LocalDate startDate;
        LocalDate endDate;
        String periodLabel;

        switch (period) {
            case LAST_WEEK -> {
                startDate = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1);
                endDate = startDate.plusDays(6);
                periodLabel = String.format("Өткен апта (%s – %s)", startDate.format(DATE_FORMATTER), endDate.format(DATE_FORMATTER));
            }
            case THIS_MONTH -> {
                startDate = now.withDayOfMonth(1);
                endDate = now.with(TemporalAdjusters.lastDayOfMonth());
                periodLabel = String.format("Осы ай (%s)", getKazakhMonthName(startDate.getMonthValue()) + " " + startDate.getYear());
            }
            case LAST_MONTH -> {
                LocalDate lastMonthDate = now.minusMonths(1);
                startDate = lastMonthDate.withDayOfMonth(1);
                endDate = lastMonthDate.with(TemporalAdjusters.lastDayOfMonth());
                periodLabel = String.format("Өткен ай (%s)", getKazakhMonthName(startDate.getMonthValue()) + " " + startDate.getYear());
            }
            case THIS_WEEK -> {
                startDate = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                endDate = startDate.plusDays(6);
                periodLabel = String.format("Осы апта (%s – %s)", startDate.format(DATE_FORMATTER), endDate.format(DATE_FORMATTER));
            }
            default -> {
                startDate = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                endDate = startDate.plusDays(6);
                periodLabel = String.format("Осы апта (%s – %s)", startDate.format(DATE_FORMATTER), endDate.format(DATE_FORMATTER));
            }
        }

        return buildLeaderboardResponse(period, periodLabel, startDate, endDate, currentUserId, isAdmin);
    }

    public LeaderboardResponseDto getCustomLeaderboard(LocalDate startDate, LocalDate endDate, String currentUserId, boolean isAdmin) {
        if (startDate == null) startDate = LocalDate.now(KZ_ZONE).withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now(KZ_ZONE);

        String periodLabel = String.format("%s – %s", startDate.format(FULL_DATE_FORMATTER), endDate.format(FULL_DATE_FORMATTER));
        return buildLeaderboardResponse(LeaderboardPeriod.THIS_MONTH, periodLabel, startDate, endDate, currentUserId, isAdmin);
    }

    private LeaderboardResponseDto buildLeaderboardResponse(
            LeaderboardPeriod period,
            String periodLabel,
            LocalDate startDate,
            LocalDate endDate,
            String currentUserId,
            boolean isAdmin
    ) {
        OffsetDateTime startDateTime = startDate.atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime endDateTime = endDate.atTime(LocalTime.MAX).atZone(KZ_ZONE).toOffsetDateTime();

        // 1. Fetch Top 100 users for the period
        List<Object[]> topRaw = audioSessionRepository.findTopUsersBetween(startDateTime, endDateTime, PageRequest.of(0, 100));
        long totalParticipants = audioSessionRepository.countParticipantsBetween(startDateTime, endDateTime);

        List<String> userIds = new ArrayList<>();
        for (Object[] row : topRaw) {
            userIds.add((String) row[0]);
        }

        // Fetch all-time seconds for top users
        Map<String, Long> allTimeMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            List<Object[]> allTimeRaw = audioSessionRepository.findTotalSecondsByUserIds(userIds);
            for (Object[] row : allTimeRaw) {
                allTimeMap.put((String) row[0], ((Number) row[1]).longValue());
            }
        }

        List<LeaderboardEntryDto> topEntries = new ArrayList<>();
        LeaderboardEntryDto currentUserEntry = null;
        int rank = 1;

        for (Object[] row : topRaw) {
            String uid = (String) row[0];
            String name = (String) row[1];
            String email = (String) row[2];
            String avatarUrl = (String) row[3];
            long periodSeconds = ((Number) row[4]).longValue();
            long allTimeSeconds = allTimeMap.getOrDefault(uid, periodSeconds);

            LeaderboardEntryDto entry = LeaderboardEntryDto.builder()
                    .rank(rank)
                    .userId(uid)
                    .fullName(name != null && !name.isBlank() ? name : "Оқырман")
                    .avatarUrl(avatarUrl)
                    .periodSeconds(periodSeconds)
                    .periodMinutes(periodSeconds / 60)
                    .allTimeSeconds(allTimeSeconds)
                    .allTimeMinutes(allTimeSeconds / 60)
                    .email(isAdmin ? email : null)
                    .build();

            topEntries.add(entry);

            if (currentUserId != null && currentUserId.equals(uid)) {
                currentUserEntry = entry;
            }

            rank++;
        }

        // If current user is not in top 100, calculate their individual rank and seconds
        if (currentUserId != null && currentUserEntry == null) {
            currentUserEntry = computeCurrentUserEntry(currentUserId, startDateTime, endDateTime, isAdmin);
        }

        return LeaderboardResponseDto.builder()
                .period(period)
                .periodLabel(periodLabel)
                .startDate(startDate)
                .endDate(endDate)
                .topEntries(topEntries)
                .currentUserEntry(currentUserEntry)
                .totalParticipants(totalParticipants)
                .build();
    }

    private LeaderboardEntryDto computeCurrentUserEntry(
            String userId,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            boolean isAdmin
    ) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return null;
        }
        User user = userOpt.get();

        // Admins, authors and staff members with duty do not participate in the leaderboard competition
        if (isStaffOrAuthor(user)) {
            return null;
        }

        long userPeriodSeconds = audioSessionRepository.getUserSecondsBetween(userId, startDateTime, endDateTime);
        long allTimeSeconds = audioSessionRepository.getUserTotalSecondsAllTime(userId);

        int rank = 0;
        if (userPeriodSeconds > 0) {
            long higherCount = audioSessionRepository.countUsersWithMoreSecondsBetween(startDateTime, endDateTime, userPeriodSeconds);
            rank = (int) higherCount + 1;
        }

        return LeaderboardEntryDto.builder()
                .rank(rank)
                .userId(userId)
                .fullName(user.getName() != null && !user.getName().isBlank() ? user.getName() : "Оқырман")
                .avatarUrl(user.getAvatarUrl())
                .periodSeconds(userPeriodSeconds)
                .periodMinutes(userPeriodSeconds / 60)
                .allTimeSeconds(allTimeSeconds)
                .allTimeMinutes(allTimeSeconds / 60)
                .email(isAdmin ? user.getEmail() : null)
                .build();
    }

    private boolean isStaffOrAuthor(User user) {
        if (user == null) return false;
        String role = user.getRole() != null ? user.getRole().toLowerCase().trim() : "";
        if ("admin".equals(role) || "author".equals(role) || "manager".equals(role)) {
            return true;
        }
        return user.getDuty() != null && !user.getDuty().isBlank();
    }

    public PersonalStatsResponseDto getPersonalStats(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        LocalDate today = LocalDate.now(KZ_ZONE);
        OffsetDateTime todayStart = today.atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime last7DaysStart = today.minusDays(6).atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime thisMonthStart = today.withDayOfMonth(1).atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime now = OffsetDateTime.now(KZ_ZONE);

        long todaySeconds = audioSessionRepository.getUserSecondsBetween(userId, todayStart, now);
        long last7DaysSeconds = audioSessionRepository.getUserSecondsBetween(userId, last7DaysStart, now);
        long thisMonthSeconds = audioSessionRepository.getUserSecondsBetween(userId, thisMonthStart, now);
        long allTimeSeconds = audioSessionRepository.getUserTotalSecondsAllTime(userId);

        // Daily activity for the last 14 days in Kazakhstan Time Zone
        LocalDate activityStart = today.minusDays(13);
        OffsetDateTime activityStartDt = activityStart.atStartOfDay(KZ_ZONE).toOffsetDateTime();
        List<Object[]> rawSessions = audioSessionRepository.getUserSessionTimesSince(userId, activityStartDt);

        Map<LocalDate, Long> daySums = new HashMap<>();
        for (Object[] row : rawSessions) {
            OffsetDateTime sessionStart = (OffsetDateTime) row[0];
            int validSec = row[1] != null ? ((Number) row[1]).intValue() : 0;
            if (sessionStart != null) {
                LocalDate day = sessionStart.atZoneSameInstant(KZ_ZONE).toLocalDate();
                daySums.put(day, daySums.getOrDefault(day, 0L) + validSec);
            }
        }

        List<DailyActivityDto> dailyActivity = new ArrayList<>();
        for (int i = 0; i < 14; i++) {
            LocalDate date = activityStart.plusDays(i);
            long sec = daySums.getOrDefault(date, 0L);
            String label = date.format(DATE_FORMATTER) + " (" + getKazakhShortDayOfWeek(date.getDayOfWeek()) + ")";
            dailyActivity.add(DailyActivityDto.builder()
                    .date(date)
                    .dayLabel(label)
                    .seconds(sec)
                    .minutes(sec / 60)
                    .build());
        }

        return PersonalStatsResponseDto.builder()
                .userId(userId)
                .fullName(user.getName() != null && !user.getName().isBlank() ? user.getName() : "Оқырман")
                .avatarUrl(user.getAvatarUrl())
                .todaySeconds(todaySeconds)
                .todayMinutes(todaySeconds / 60)
                .last7DaysSeconds(last7DaysSeconds)
                .last7DaysMinutes(last7DaysSeconds / 60)
                .thisMonthSeconds(thisMonthSeconds)
                .thisMonthMinutes(thisMonthSeconds / 60)
                .allTimeSeconds(allTimeSeconds)
                .allTimeMinutes(allTimeSeconds / 60)
                .dailyActivity(dailyActivity)
                .build();
    }

    private static String getKazakhMonthName(int month) {
        return switch (month) {
            case 1 -> "Қаңтар";
            case 2 -> "Ақпан";
            case 3 -> "Наурыз";
            case 4 -> "Сәуір";
            case 5 -> "Мамыр";
            case 6 -> "Маусым";
            case 7 -> "Шілде";
            case 8 -> "Тамыз";
            case 9 -> "Қыркүйек";
            case 10 -> "Қазан";
            case 11 -> "Қараша";
            case 12 -> "Желтоқсан";
            default -> "";
        };
    }

    private static String getKazakhShortDayOfWeek(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "Дс";
            case TUESDAY -> "Сс";
            case WEDNESDAY -> "Ср";
            case THURSDAY -> "Бс";
            case FRIDAY -> "Жм";
            case SATURDAY -> "Сб";
            case SUNDAY -> "Жс";
        };
    }
}
