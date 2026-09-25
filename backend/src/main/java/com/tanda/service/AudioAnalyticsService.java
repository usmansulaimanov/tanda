package com.tanda.service;

import com.tanda.dto.audio.AdminAudioBookStatDto;

import com.tanda.dto.audio.AdminAudioStatsResponseDto;
import com.tanda.dto.audio.TopAudioBookResponseDto;
import com.tanda.dto.book.BookAudienceMemberDto;
import com.tanda.dto.book.BookStatsResponseDto;
import com.tanda.dto.book.UserBookListeningStatsResponseDto;
import com.tanda.dto.royalty.AuthorDailyStatDto;
import com.tanda.dto.royalty.PeakDayDto;

import com.tanda.dto.user.ReaderBookListeningDto;
import com.tanda.dto.user.ReaderDetailedStatsResponseDto;
import com.tanda.dto.user.ReaderListeningOverviewDto;
import com.tanda.entity.AudioDailyStats;
import com.tanda.entity.AudioSession;
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.AuthorDailyBookStats;
import com.tanda.entity.Book;
import com.tanda.entity.DailyTopBook;
import com.tanda.entity.PremiumEntitlement;
import com.tanda.entity.User;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioDailyStatsRepository;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorDailyBookStatsRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.DailyTopBookRepository;
import com.tanda.repository.PremiumEntitlementRepository;
import com.tanda.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioAnalyticsService {

    public static final ZoneId KZ_ZONE = ZoneId.of("Asia/Almaty");
    public static final int TOP_DAILY_COUNT = 10;
    private static final OffsetDateTime ALL_TIME_EPOCH = OffsetDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

    private final AudioSessionRepository audioSessionRepository;
    private final AudioDailyStatsRepository audioDailyStatsRepository;
    private final DailyTopBookRepository dailyTopBookRepository;
    private final BookRepository bookRepository;
    private final BookService bookService;
    private final AuthorBookRepository authorBookRepository;
    private final AuthorRepository authorRepository;
    private final AuthorDailyBookStatsRepository authorDailyBookStatsRepository;
    private final UserRepository userRepository;
    private final PremiumEntitlementRepository premiumEntitlementRepository;

    @PostConstruct
    public void initOnStartup() {
        try {
            LocalDate latestDate = dailyTopBookRepository.findLatestSnapshotDate();
            if (latestDate == null) {
                log.info("No daily top books snapshot found on startup. Generating initial snapshot...");
                calculateDailyTopBooks();
            }
        } catch (Exception e) {
            log.warn("Could not calculate initial daily top books on startup: {}", e.getMessage());
        }
    }

    /**
     * Nightly scheduled recalculation of Top 10 Audiobooks at 00:00:00 Asia/Almaty (UTC+5).
     * Aggregates daily listening volume and generates the snapshot for the current day.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Almaty")
    @Transactional
    public synchronized void calculateDailyTopBooks() {
        LocalDate today = LocalDate.now(KZ_ZONE);
        LocalDate yesterday = today.minusDays(1);
        log.info("Starting Daily Top 10 Audiobooks calculation for snapshotDate={}, yesterday={}", today, yesterday);

        Map<String, BookActivity> activityMap = new HashMap<>();

        // 1. Gather stats from AudioDailyStats for yesterday
        List<AudioDailyStats> dailyStatsList = audioDailyStatsRepository.findByStatDateOrderByTotalSecondsDesc(yesterday);
        for (AudioDailyStats ds : dailyStatsList) {
            if (ds.getBook() != null) {
                activityMap.put(ds.getBook().getId(), new BookActivity(
                        ds.getBook().getId(),
                        ds.getTotalSeconds() != null ? ds.getTotalSeconds() : 0L,
                        ds.getListenCount() != null ? ds.getListenCount().longValue() : 0L
                ));
            }
        }

        // 2. Query audio sessions (recent 7 days / all-time) to include all active sessions
        OffsetDateTime sevenDaysAgo = OffsetDateTime.now(KZ_ZONE).minusDays(7);
        List<Object[]> sessionRows = audioSessionRepository.findTopAudioSessionsSince(sevenDaysAgo, PageRequest.of(0, 50));
        if (sessionRows.isEmpty()) {
            sessionRows = audioSessionRepository.findTopAudioSessionsSince(ALL_TIME_EPOCH, PageRequest.of(0, 50));
        }

        for (Object[] row : sessionRows) {
            String bookId = (String) row[0];
            long count = ((Number) row[1]).longValue();
            long seconds = ((Number) row[2]).longValue();

            activityMap.compute(bookId, (k, existing) -> {
                if (existing == null) {
                    return new BookActivity(bookId, seconds, count);
                }
                return new BookActivity(
                        bookId,
                        Math.max(existing.seconds, seconds),
                        Math.max(existing.listens, count)
                );
            });
        }

        // 3. Sort active books by listening seconds and listens
        List<BookActivity> rankedActivities = new ArrayList<>(activityMap.values());
        rankedActivities.sort(Comparator.comparingLong(BookActivity::getListens).reversed()
                .thenComparing(Comparator.comparingLong(BookActivity::getSeconds).reversed()));

        Set<String> chosenBookIds = new LinkedHashSet<>();
        List<DailyTopCandidate> candidates = new ArrayList<>();

        for (BookActivity act : rankedActivities) {
            if (candidates.size() >= TOP_DAILY_COUNT) break;
            Book b = bookRepository.findById(act.bookId).orElse(null);
            if (b == null || Boolean.TRUE.equals(b.getIsArchived())) continue;
            if (!isAudioBook(b)) continue;

            candidates.add(new DailyTopCandidate(b, act.seconds, act.listens));
            chosenBookIds.add(b.getId());
        }

        // 4. Fallback (Option Ә): If < 10 books have activity, pad with other active audiobooks
        if (candidates.size() < TOP_DAILY_COUNT) {
            List<Book> activeBooks = bookRepository.findByIsArchivedFalse();
            activeBooks.sort(Comparator.comparing(Book::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

            for (Book b : activeBooks) {
                if (candidates.size() >= TOP_DAILY_COUNT) break;
                if (!chosenBookIds.contains(b.getId()) && isAudioBook(b)) {
                    candidates.add(new DailyTopCandidate(b, 0L, 0L));
                    chosenBookIds.add(b.getId());
                }
            }
        }

        // 5. Clear previous snapshot for today and persist new top 10
        dailyTopBookRepository.deleteBySnapshotDate(today);

        List<DailyTopBook> snapshotEntities = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            DailyTopCandidate c = candidates.get(i);
            snapshotEntities.add(DailyTopBook.builder()
                    .id("dtb-" + today + "-" + (i + 1) + "-" + UUID.randomUUID().toString().substring(0, 8))
                    .snapshotDate(today)
                    .rank(i + 1)
                    .book(c.book)
                    .todaySeconds(c.todaySeconds)
                    .todayListens(c.todayListens)
                    .createdAt(OffsetDateTime.now())
                    .build());
        }

        dailyTopBookRepository.saveAll(snapshotEntities);
        log.info("Daily Top 10 Audiobooks calculated successfully for date {} (total {} books saved)", today, snapshotEntities.size());
    }

    @Transactional
    public List<TopAudioBookResponseDto> getTopAudioBooks(int limit) {
        int effectiveLimit = Math.max(1, Math.min(limit, 50));
        LocalDate latestDate = dailyTopBookRepository.findLatestSnapshotDate();

        List<DailyTopBook> snapshot = latestDate != null
                ? dailyTopBookRepository.findBySnapshotDateOrderByRankAsc(latestDate)
                : List.of();

        if (snapshot.isEmpty()) {
            calculateDailyTopBooks();
            latestDate = dailyTopBookRepository.findLatestSnapshotDate();
            snapshot = latestDate != null
                    ? dailyTopBookRepository.findBySnapshotDateOrderByRankAsc(latestDate)
                    : List.of();
        }

        OffsetDateTime todayStart = LocalDate.now(KZ_ZONE).atStartOfDay(KZ_ZONE).toOffsetDateTime();
        List<TopAudioBookResponseDto> result = new ArrayList<>();
        Set<String> seenBookIds = new LinkedHashSet<>();

        for (DailyTopBook dtb : snapshot) {
            Book book = dtb.getBook();
            if (book == null || Boolean.TRUE.equals(book.getIsArchived())) {
                continue;
            }
            if (result.size() >= effectiveLimit) {
                break;
            }

            long totalListens = audioSessionRepository.countSessionsForBookSince(book.getId(), ALL_TIME_EPOCH);
            long todayListens = audioSessionRepository.countSessionsForBookSince(book.getId(), todayStart);
            if (todayListens == 0 && dtb.getTodayListens() > 0) {
                todayListens = dtb.getTodayListens();
            }

            result.add(TopAudioBookResponseDto.builder()
                    .book(bookService.toResponseDto(book))
                    .todayListens(todayListens)
                    .totalListens(totalListens > 0 ? totalListens : dtb.getTodayListens())
                    .totalSeconds(dtb.getTodaySeconds())
                    .build());
            seenBookIds.add(book.getId());
        }

        // Dynamic fallback padding if snapshot returned fewer than effectiveLimit active books
        if (result.size() < effectiveLimit) {
            List<Book> activeBooks = bookRepository.findByIsArchivedFalse();
            activeBooks.sort(Comparator.comparing(Book::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

            for (Book b : activeBooks) {
                if (result.size() >= effectiveLimit) break;
                if (!seenBookIds.contains(b.getId()) && isAudioBook(b)) {
                    long totalListens = audioSessionRepository.countSessionsForBookSince(b.getId(), ALL_TIME_EPOCH);
                    long todayListens = audioSessionRepository.countSessionsForBookSince(b.getId(), todayStart);
                    result.add(TopAudioBookResponseDto.builder()
                            .book(bookService.toResponseDto(b))
                            .todayListens(todayListens)
                            .totalListens(totalListens)
                            .totalSeconds(0L)
                            .build());
                    seenBookIds.add(b.getId());
                }
            }
        }

        // Ensure 1-based sequential ranks
        for (int i = 0; i < result.size(); i++) {
            result.get(i).setRank(i + 1);
        }

        return result;
    }

    @Transactional(readOnly = true)
    public AdminAudioStatsResponseDto getAdminAudioStats() {
        List<Object[]> globalRows = audioSessionRepository.getGlobalAudioStats();
        long totalSessions = 0;
        long totalSeconds = 0;
        long uniqueListeners = 0;

        if (globalRows != null && !globalRows.isEmpty() && globalRows.get(0) != null) {
            Object[] g = globalRows.get(0);
            totalSessions = g[0] != null ? ((Number) g[0]).longValue() : 0;
            totalSeconds = g[1] != null ? ((Number) g[1]).longValue() : 0;
            uniqueListeners = g[2] != null ? ((Number) g[2]).longValue() : 0;
        }

        double totalHours = Math.round((totalSeconds / 3600.0) * 10.0) / 10.0;

        List<Object[]> perBookRows = audioSessionRepository.getAudioStatsPerBook(PageRequest.of(0, 20));
        List<AdminAudioBookStatDto> topBooks = new ArrayList<>();

        for (Object[] row : perBookRows) {
            String bookId = (String) row[0];
            long count = ((Number) row[1]).longValue();
            long seconds = ((Number) row[2]).longValue();
            long listeners = ((Number) row[3]).longValue();

            Book book = bookRepository.findById(bookId).orElse(null);
            topBooks.add(AdminAudioBookStatDto.builder()
                    .bookId(bookId)
                    .title(book != null ? book.getTitle() : "Unknown Book")
                    .author(book != null ? book.getAuthor() : "Unknown Author")
                    .coverImage(book != null ? book.getCoverImage() : null)
                    .sessionsCount(count)
                    .totalSeconds(seconds)
                    .uniqueListeners(listeners)
                    .build());
        }

        return AdminAudioStatsResponseDto.builder()
                .totalSessions(totalSessions)
                .totalSeconds(totalSeconds)
                .totalListeningHours(totalHours)
                .uniqueListeners(uniqueListeners)
                .topBooks(topBooks)
                .build();
    }

    @Transactional(readOnly = true)
    public BookStatsResponseDto getBookStats(String bookId, String monthKey, String currentUserId, boolean isAdmin) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", bookId));

        // Security check for non-admin authors
        if (!isAdmin) {
            boolean isAuthorized = false;
            if (currentUserId != null) {
                Author author = authorRepository.findByUserId(currentUserId)
                        .or(() -> authorRepository.findById(currentUserId))
                        .orElse(null);

                String effectiveAuthorId = author != null ? author.getId() : currentUserId;
                List<AuthorBook> assignments = authorBookRepository.findByAuthorIdAndIsActiveTrue(effectiveAuthorId);
                boolean isAssigned = assignments.stream().anyMatch(ab -> ab.getBookId().equals(bookId));
                if (isAssigned) {
                    isAuthorized = true;
                } else {
                    String authorDisplayName = author != null ? author.getDisplayName() : null;
                    if (authorDisplayName == null) {
                        User currentUser = userRepository.findById(currentUserId).orElse(null);
                        if (currentUser != null) {
                            authorDisplayName = currentUser.getName();
                        }
                    }
                    if (authorDisplayName != null && !authorDisplayName.isBlank() && book.getAuthor() != null) {
                        String match1 = authorDisplayName.trim().toLowerCase();
                        String match2 = book.getAuthor().trim().toLowerCase();
                        if (match1.equals(match2) || match2.contains(match1) || match1.contains(match2)) {
                            isAuthorized = true;
                        }
                    }
                }
            }
            if (!isAuthorized) {
                throw new AccessDeniedException("Бұл кітаптың статистикасын көруге құқығыңыз жоқ");
            }
        }


        // Parse target month
        String targetMonth = monthKey;
        if (targetMonth == null || targetMonth.isBlank()) {
            YearMonth now = YearMonth.now(KZ_ZONE);
            targetMonth = String.format("%04d-%02d", now.getYear(), now.getMonthValue());
        }
        YearMonth ym;
        try {
            ym = YearMonth.parse(targetMonth);
        } catch (Exception e) {
            YearMonth now = YearMonth.now(KZ_ZONE);
            targetMonth = String.format("%04d-%02d", now.getYear(), now.getMonthValue());
            ym = now;
        }

        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();
        LocalDate today = LocalDate.now(KZ_ZONE);

        // Find assigned author ID
        String assignedAuthorId = null;
        List<AuthorBook> activeAssignments = authorBookRepository.findByBookIdAndIsActiveTrue(bookId);
        if (!activeAssignments.isEmpty()) {
            assignedAuthorId = activeAssignments.get(0).getAuthorId();
        } else if (book.getAuthor() != null && !book.getAuthor().isBlank()) {
            String bookAuthorName = book.getAuthor().trim().toLowerCase();
            assignedAuthorId = authorRepository.findAll().stream()
                    .filter(a -> a.getDisplayName() != null && a.getDisplayName().trim().equalsIgnoreCase(bookAuthorName))
                    .map(Author::getId)
                    .findFirst()
                    .orElse(null);
        }

        // Daily stats map for the month
        Map<String, Long> dateSecondsMap = new HashMap<>();

        List<AudioDailyStats> dailyStats = audioDailyStatsRepository.findByBookIdAndStatDateBetween(bookId, startDate, endDate);
        for (AudioDailyStats s : dailyStats) {
            String d = s.getStatDate().toString();
            long sec = s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L;
            dateSecondsMap.put(d, Math.max(dateSecondsMap.getOrDefault(d, 0L), sec));
        }

        List<AuthorDailyBookStats> authorDailyStats = authorDailyBookStatsRepository.findByBookIdAndStatDateBetween(bookId, startDate, endDate);
        for (AuthorDailyBookStats s : authorDailyStats) {
            String d = s.getStatDate().toString();
            long sec = s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L;
            dateSecondsMap.put(d, Math.max(dateSecondsMap.getOrDefault(d, 0L), sec));
        }

        int daysInMonth = ym.lengthOfMonth();
        List<AuthorDailyStatDto> dailyList = new ArrayList<>(daysInMonth);
        long monthTotalSec = 0L;
        long peakSec = 0L;
        String peakDateStr = null;

        for (int day = 1; day <= daysInMonth; day++) {
            LocalDate date = ym.atDay(day);
            String iso = date.toString();
            long sec = dateSecondsMap.getOrDefault(iso, 0L);
            if (sec > peakSec) {
                peakSec = sec;
                peakDateStr = iso;
            }
            monthTotalSec += sec;

            String dayNum = String.format("%02d", day);
            String monthNum = String.format("%02d", ym.getMonthValue());
            String shortDateStr = dayNum + "." + monthNum + ".";

            dailyList.add(AuthorDailyStatDto.builder()
                    .date(iso)
                    .label(shortDateStr)
                    .shortLabel(shortDateStr)
                    .seconds(sec)
                    .minutes(Math.round((sec / 60.0) * 10.0) / 10.0)
                    .isToday(date.equals(today))
                    .isPeak(false)
                    .build());
        }

        // Mark peak
        PeakDayDto peakDayDto = null;
        if (peakDateStr != null && peakSec > 0) {
            for (AuthorDailyStatDto d : dailyList) {
                if (d.getDate().equals(peakDateStr)) {
                    d.setIsPeak(true);
                }
            }
            String[] parts = peakDateStr.split("-");
            peakDayDto = PeakDayDto.builder()
                    .date(peakDateStr)
                    .label(parts[2] + "." + parts[1] + "." + parts[0])
                    .seconds(peakSec)
                    .minutes(Math.round((peakSec / 60.0) * 10.0) / 10.0)
                    .build();
        }

        long todaySec = dateSecondsMap.getOrDefault(today.toString(), 0L);

        // All-time seconds calculation
        long allTimeSec = 0L;
        List<AudioDailyStats> allDaily = audioDailyStatsRepository.findByBookId(bookId);
        for (AudioDailyStats s : allDaily) {
            allTimeSec += s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L;
        }
        List<AuthorDailyBookStats> allAuthorDaily = authorDailyBookStatsRepository.findByBookId(bookId);
        long allAuthorDailySec = 0L;
        for (AuthorDailyBookStats s : allAuthorDaily) {
            allAuthorDailySec += s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L;
        }
        allTimeSec = Math.max(allTimeSec, allAuthorDailySec);
        if (monthTotalSec > allTimeSec) {
            allTimeSec = monthTotalSec;
        }

        // Unique listeners (3 engagement tiers: >=1m, >=15m, >=1h)
        OffsetDateTime monthStart = startDate.atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime monthEnd = endDate.plusDays(1).atStartOfDay(KZ_ZONE).toOffsetDateTime();

        List<Object[]> monthUserSums = audioSessionRepository.getUserListeningSumsForBookBetween(bookId, monthStart, monthEnd);
        long monthListeners = 0;
        long monthReaders = 0;
        long monthActives = 0;
        for (Object[] row : monthUserSums) {
            long sec = ((Number) row[1]).longValue();
            if (sec >= 60) monthListeners++;
            if (sec >= 900) monthReaders++;
            if (sec >= 3600) monthActives++;
        }

        List<Object[]> allTimeUserSums = audioSessionRepository.getUserListeningSumsForBookAllTime(bookId);
        long allTimeListeners = 0;
        long allTimeReaders = 0;
        long allTimeActives = 0;
        for (Object[] row : allTimeUserSums) {
            long sec = ((Number) row[1]).longValue();
            if (sec >= 60) allTimeListeners++;
            if (sec >= 900) allTimeReaders++;
            if (sec >= 3600) allTimeActives++;
        }

        if (monthListeners > allTimeListeners) allTimeListeners = monthListeners;
        if (monthReaders > allTimeReaders) allTimeReaders = monthReaders;
        if (monthActives > allTimeActives) allTimeActives = monthActives;

        int totalListenedDays = (int) dailyList.stream().filter(d -> d.getSeconds() > 0).count();
        double avgDailyMin = totalListenedDays > 0
                ? Math.round(((monthTotalSec / 60.0) / totalListenedDays) * 10.0) / 10.0
                : 0.0;

        return BookStatsResponseDto.builder()
                .bookId(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())
                .coverImage(book.getCoverImage())
                .category(book.getCategory())
                .pages(book.getPages())
                .hasAudio(book.getHasAudio())
                .hasEbook(book.getHasEbook())
                .audioDuration(book.getAudioDuration())
                .assignedAuthorId(assignedAuthorId)
                .selectedMonth(targetMonth)
                .selectedMonthLabel(RoyaltyService.getMonthLabel(targetMonth))
                .todaySeconds(todaySec)
                .todayMinutes(Math.round((todaySec / 60.0) * 10.0) / 10.0)
                .monthSeconds(monthTotalSec)
                .monthMinutes(Math.round((monthTotalSec / 60.0) * 10.0) / 10.0)
                .monthHours(Math.round((monthTotalSec / 3600.0) * 10.0) / 10.0)
                .allTimeSeconds(allTimeSec)
                .allTimeMinutes(Math.round((allTimeSec / 60.0) * 10.0) / 10.0)
                .allTimeHours(Math.round((allTimeSec / 3600.0) * 10.0) / 10.0)
                .monthUniqueListeners(monthListeners)
                .allTimeUniqueListeners(allTimeListeners)
                .monthListeners(monthListeners)
                .allTimeListeners(allTimeListeners)
                .monthReaders(monthReaders)
                .allTimeReaders(allTimeReaders)
                .monthActives(monthActives)
                .allTimeActives(allTimeActives)
                .peakDay(peakDayDto)
                .dailyList(dailyList)
                .totalListenedDays(totalListenedDays)
                .averageDailyMinutes(avgDailyMin)
                .build();
    }

    @Transactional(readOnly = true)
    public List<BookAudienceMemberDto> getBookAudience(String bookId, String tier, String scope, String monthKey) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Кітап табылмады"));

        int minSeconds = 60;
        if ("READERS".equalsIgnoreCase(tier)) {
            minSeconds = 900;
        } else if ("ACTIVES".equalsIgnoreCase(tier)) {
            minSeconds = 3600;
        }

        List<Object[]> rawList;
        if ("ALL_TIME".equalsIgnoreCase(scope)) {
            rawList = audioSessionRepository.getAudienceForBookAllTime(bookId, minSeconds);
        } else {
            String targetMonth = (monthKey != null && !monthKey.isBlank())
                    ? monthKey
                    : LocalDate.now(KZ_ZONE).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));

            YearMonth ym;
            try {
                ym = YearMonth.parse(targetMonth);
            } catch (Exception e) {
                ym = YearMonth.now(KZ_ZONE);
            }
            LocalDate startDate = ym.atDay(1);
            LocalDate endDate = ym.atEndOfMonth();
            OffsetDateTime monthStart = startDate.atStartOfDay(KZ_ZONE).toOffsetDateTime();
            OffsetDateTime monthEnd = endDate.plusDays(1).atStartOfDay(KZ_ZONE).toOffsetDateTime();
            rawList = audioSessionRepository.getAudienceForBookBetween(bookId, monthStart, monthEnd, minSeconds);
        }

        OffsetDateTime todayStart = LocalDate.now(KZ_ZONE).atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime todayEnd = todayStart.plusDays(1);
        Map<String, Long> todayUserSecondsMap = audioSessionRepository.getUserListeningSumsForBookBetween(bookId, todayStart, todayEnd)
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).longValue(),
                        (a, b) -> a
                ));

        List<BookAudienceMemberDto> result = new ArrayList<>();
        for (Object[] row : rawList) {
            User u = (User) row[0];
            long sec = ((Number) row[1]).longValue();
            OffsetDateTime lastListened = row[2] != null ? (OffsetDateTime) row[2] : null;

            long minutes = sec / 60;
            long hours = sec / 3600;
            long remMin = minutes % 60;
            long remSec = sec % 60;

            String formattedDuration;
            if (hours > 0) {
                formattedDuration = hours + " сағ" + (remMin > 0 ? " " + remMin + " мин" : "");
            } else if (minutes > 0) {
                formattedDuration = minutes + " мин" + (remSec > 0 ? " " + remSec + " сек" : "");
            } else {
                formattedDuration = sec + " сек";
            }

            long todaySec = todayUserSecondsMap.getOrDefault(u.getId(), 0L);
            long todayMin = todaySec / 60;
            long todayHrs = todaySec / 3600;
            long todayRemMin = todayMin % 60;
            long todayRemSec = todaySec % 60;

            String todayFormattedDuration;
            if (todayHrs > 0) {
                todayFormattedDuration = todayHrs + " сағ" + (todayRemMin > 0 ? " " + todayRemMin + " мин" : "");
            } else if (todayMin > 0) {
                todayFormattedDuration = todayMin + " мин" + (todayRemSec > 0 ? " " + todayRemSec + " сек" : "");
            } else if (todaySec > 0) {
                todayFormattedDuration = todaySec + " сек";
            } else {
                todayFormattedDuration = "0 мин";
            }

            result.add(BookAudienceMemberDto.builder()
                    .userId(u.getId())
                    .idNumber(u.getIdNumber())
                    .name(u.getName())
                    .email(u.getEmail())
                    .phone(u.getPhone())
                    .username(u.getUsername())
                    .avatarUrl(u.getAvatarUrl())
                    .totalSeconds(sec)
                    .totalMinutes(minutes)
                    .formattedDuration(formattedDuration.trim())
                    .todaySeconds(todaySec)
                    .todayFormattedDuration(todayFormattedDuration.trim())
                    .lastListenedAt(lastListened)
                    .build());
        }

        return result;
    }

    @Transactional(readOnly = true)
    public UserBookListeningStatsResponseDto getUserBookListeningStats(String bookId, String userId, String monthKey) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Кітап табылмады"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Оқырман табылмады"));

        String targetMonth = (monthKey != null && !monthKey.isBlank())
                ? monthKey
                : LocalDate.now(KZ_ZONE).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));

        YearMonth ym;
        try {
            ym = YearMonth.parse(targetMonth);
        } catch (Exception e) {
            ym = YearMonth.now(KZ_ZONE);
            targetMonth = ym.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        }

        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();
        OffsetDateTime monthStart = startDate.atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime monthEnd = endDate.plusDays(1).atStartOfDay(KZ_ZONE).toOffsetDateTime();

        LocalDate today = LocalDate.now(KZ_ZONE);
        OffsetDateTime todayStart = today.atStartOfDay(KZ_ZONE).toOffsetDateTime();

        // 1. User's total listening across all books today
        long userTodayTotalSec = audioSessionRepository.getUserTotalListeningSince(userId, todayStart);

        // 2. User's listening for THIS book today
        long todayBookSec = audioSessionRepository.getUserBookListeningSince(bookId, userId, todayStart);

        // 3. User's listening for THIS book all-time
        long allTimeBookSec = audioSessionRepository.getUserBookListeningAllTime(bookId, userId);

        // 4. Daily breakdown for this month
        List<AudioSession> monthSessions = audioSessionRepository.findUserSessionsForBookBetween(bookId, userId, monthStart, monthEnd);
        Map<LocalDate, Long> daySums = new HashMap<>();
        for (AudioSession s : monthSessions) {
            if (s.getStartedAt() != null && s.getValidSeconds() != null) {
                LocalDate d = s.getStartedAt().atZoneSameInstant(KZ_ZONE).toLocalDate();
                daySums.put(d, daySums.getOrDefault(d, 0L) + s.getValidSeconds());
            }
        }

        List<AuthorDailyStatDto> dailyList = new ArrayList<>();
        long monthTotalSec = 0L;
        LocalDate peakDay = null;
        long peakSeconds = 0L;

        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            long sec = daySums.getOrDefault(d, 0L);
            monthTotalSec += sec;

            if (sec > peakSeconds) {
                peakSeconds = sec;
                peakDay = d;
            }

            String dayNum = String.format("%02d", d.getDayOfMonth());
            String monthNum = String.format("%02d", d.getMonthValue());
            String shortDateStr = dayNum + "." + monthNum + ".";

            dailyList.add(AuthorDailyStatDto.builder()
                    .date(d.toString())
                    .label(shortDateStr)
                    .shortLabel(shortDateStr)
                    .seconds(sec)
                    .minutes(Math.round((sec / 60.0) * 10.0) / 10.0)
                    .isToday(d.equals(today))
                    .isPeak(false)
                    .build());
        }

        if (monthTotalSec > allTimeBookSec) {
            allTimeBookSec = monthTotalSec;
        }

        PeakDayDto peakDayDto = null;
        if (peakDay != null && peakSeconds > 0) {
            final LocalDate finalPeakDay = peakDay;
            for (AuthorDailyStatDto ds : dailyList) {
                if (ds.getDate().equals(finalPeakDay.toString())) {
                    ds.setIsPeak(true);
                }
            }
            peakDayDto = PeakDayDto.builder()
                    .date(peakDay.toString())
                    .label(peakDay.format(java.time.format.DateTimeFormatter.ofPattern("d MMMM", new java.util.Locale("kk", "KZ"))))
                    .seconds(peakSeconds)
                    .minutes(Math.round((peakSeconds / 60.0) * 10.0) / 10.0)
                    .build();
        }

        int totalListenedDays = (int) dailyList.stream().filter(d -> d.getSeconds() > 0).count();
        double avgDailyMin = totalListenedDays > 0
                ? Math.round(((monthTotalSec / 60.0) / totalListenedDays) * 10.0) / 10.0
                : 0.0;

        return UserBookListeningStatsResponseDto.builder()
                .userId(user.getId())
                .userName(user.getName())
                .userEmail(user.getEmail())
                .userPhone(user.getPhone())
                .userAvatarUrl(user.getAvatarUrl())
                .userIdNumber(user.getIdNumber())
                .userUsername(user.getUsername())
                .bookId(book.getId())
                .bookTitle(book.getTitle())
                .bookAuthor(book.getAuthor())
                .bookCoverImage(book.getCoverImage())
                .bookCategory(book.getCategory())
                .selectedMonth(targetMonth)
                .selectedMonthLabel(RoyaltyService.getMonthLabel(targetMonth))
                .userTodayTotalSeconds(userTodayTotalSec)
                .userTodayTotalMinutes(Math.round((userTodayTotalSec / 60.0) * 10.0) / 10.0)
                .todayBookSeconds(todayBookSec)
                .todayBookMinutes(Math.round((todayBookSec / 60.0) * 10.0) / 10.0)
                .monthBookSeconds(monthTotalSec)
                .monthBookMinutes(Math.round((monthTotalSec / 60.0) * 10.0) / 10.0)
                .monthBookHours(Math.round((monthTotalSec / 3600.0) * 10.0) / 10.0)
                .allTimeBookSeconds(allTimeBookSec)
                .allTimeBookMinutes(Math.round((allTimeBookSec / 60.0) * 10.0) / 10.0)
                .allTimeBookHours(Math.round((allTimeBookSec / 3600.0) * 10.0) / 10.0)
                .peakDay(peakDayDto)
                .dailyList(dailyList)
                .totalListenedDays(totalListenedDays)
                .averageDailyMinutes(avgDailyMin)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ReaderListeningOverviewDto> getReadersListeningOverview(String monthKey) {
        String targetMonth = (monthKey != null && !monthKey.isBlank())
                ? monthKey
                : LocalDate.now(KZ_ZONE).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));

        YearMonth ym;
        try {
            ym = YearMonth.parse(targetMonth);
        } catch (Exception e) {
            ym = YearMonth.now(KZ_ZONE);
        }

        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();
        OffsetDateTime monthStart = startDate.atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime monthEnd = endDate.plusDays(1).atStartOfDay(KZ_ZONE).toOffsetDateTime();

        LocalDate today = LocalDate.now(KZ_ZONE);
        OffsetDateTime todayStart = today.atStartOfDay(KZ_ZONE).toOffsetDateTime();

        List<User> clients = userRepository.findAllClients();

        OffsetDateTime now = OffsetDateTime.now();
        Set<String> premiumUserIds = premiumEntitlementRepository.findByIsActiveTrueAndExpiresAtAfter(now)
                .stream()
                .map(PremiumEntitlement::getUserId)
                .collect(Collectors.toSet());

        Map<String, Long> todayMap = audioSessionRepository.sumValidSecondsByUserSince(todayStart)
                .stream()
                .filter(r -> r != null && r.length >= 2 && r[0] != null)
                .collect(Collectors.toMap(r -> (String) r[0], r -> ((Number) r[1]).longValue(), (a, b) -> a));

        Map<String, Long> monthMap = audioSessionRepository.sumValidSecondsByUserBetween(monthStart, monthEnd)
                .stream()
                .filter(r -> r != null && r.length >= 2 && r[0] != null)
                .collect(Collectors.toMap(r -> (String) r[0], r -> ((Number) r[1]).longValue(), (a, b) -> a));

        Map<String, Long> allTimeMap = audioSessionRepository.sumValidSecondsByUserAllTime()
                .stream()
                .filter(r -> r != null && r.length >= 2 && r[0] != null)
                .collect(Collectors.toMap(r -> (String) r[0], r -> ((Number) r[1]).longValue(), (a, b) -> a));

        List<ReaderListeningOverviewDto> result = new ArrayList<>();
        for (User u : clients) {
            long todaySec = todayMap.getOrDefault(u.getId(), 0L);
            long monthSec = monthMap.getOrDefault(u.getId(), 0L);
            long allTimeSec = allTimeMap.getOrDefault(u.getId(), 0L);

            result.add(ReaderListeningOverviewDto.builder()
                    .id(u.getId())
                    .idNumber(u.getIdNumber())
                    .name(u.getName())
                    .email(u.getEmail())
                    .phone(u.getPhone())
                    .username(u.getUsername())
                    .avatarUrl(u.getAvatarUrl())
                    .birthDate(u.getBirthDate())
                    .gender(u.getGender())
                    .isActive(u.getIsActive())
                    .isBlocked(u.getIsBlocked())
                    .isPremium(premiumUserIds.contains(u.getId()))
                    .createdAt(u.getCreatedAt())
                    .todaySeconds(todaySec)
                    .todayMinutes(Math.round((todaySec / 60.0) * 10.0) / 10.0)
                    .todayFormatted(formatDuration(todaySec))
                    .monthSeconds(monthSec)
                    .monthMinutes(Math.round((monthSec / 60.0) * 10.0) / 10.0)
                    .monthFormatted(formatDuration(monthSec))
                    .allTimeSeconds(allTimeSec)
                    .allTimeMinutes(Math.round((allTimeSec / 60.0) * 10.0) / 10.0)
                    .allTimeFormatted(formatDuration(allTimeSec))
                    .build());
        }

        return result;
    }

    @Transactional(readOnly = true)
    public ReaderDetailedStatsResponseDto getReaderDetailedStats(String userId, String monthKey) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Оқырман табылмады"));

        String targetMonth = (monthKey != null && !monthKey.isBlank())
                ? monthKey
                : LocalDate.now(KZ_ZONE).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));

        YearMonth ym;
        try {
            ym = YearMonth.parse(targetMonth);
        } catch (Exception e) {
            ym = YearMonth.now(KZ_ZONE);
            targetMonth = ym.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        }

        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();
        OffsetDateTime monthStart = startDate.atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime monthEnd = endDate.plusDays(1).atStartOfDay(KZ_ZONE).toOffsetDateTime();

        LocalDate today = LocalDate.now(KZ_ZONE);
        OffsetDateTime todayStart = today.atStartOfDay(KZ_ZONE).toOffsetDateTime();

        // 1. Listening totals
        long userTodayTotalSec = audioSessionRepository.getUserTotalListeningSince(userId, todayStart);
        long allTimeSec = 0L;
        for (Object[] r : audioSessionRepository.getUserListeningSumsPerBookAllTime(userId)) {
            if (r != null && r.length >= 2 && r[1] instanceof Number) {
                allTimeSec += ((Number) r[1]).longValue();
            }
        }

        // 2. Daily breakdown for this month across all books
        List<AudioSession> monthSessions = audioSessionRepository.findUserSessionsBetween(userId, monthStart, monthEnd);
        Map<LocalDate, Long> daySums = new HashMap<>();
        for (AudioSession s : monthSessions) {
            if (s.getStartedAt() != null && s.getValidSeconds() != null) {
                LocalDate d = s.getStartedAt().atZoneSameInstant(KZ_ZONE).toLocalDate();
                daySums.put(d, daySums.getOrDefault(d, 0L) + s.getValidSeconds());
            }
        }

        List<AuthorDailyStatDto> dailyList = new ArrayList<>();
        long monthTotalSec = 0L;
        LocalDate peakDay = null;
        long peakSeconds = 0L;

        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            long sec = daySums.getOrDefault(d, 0L);
            monthTotalSec += sec;

            if (sec > peakSeconds) {
                peakSeconds = sec;
                peakDay = d;
            }

            String dayNum = String.format("%02d", d.getDayOfMonth());
            String monthNum = String.format("%02d", d.getMonthValue());
            String shortDateStr = dayNum + "." + monthNum + ".";

            dailyList.add(AuthorDailyStatDto.builder()
                    .date(d.toString())
                    .label(shortDateStr)
                    .shortLabel(shortDateStr)
                    .seconds(sec)
                    .minutes(Math.round((sec / 60.0) * 10.0) / 10.0)
                    .isToday(d.equals(today))
                    .isPeak(false)
                    .build());
        }

        if (monthTotalSec > allTimeSec) {
            allTimeSec = monthTotalSec;
        }

        PeakDayDto peakDayDto = null;
        if (peakDay != null && peakSeconds > 0) {
            final LocalDate finalPeakDay = peakDay;
            for (AuthorDailyStatDto ds : dailyList) {
                if (ds.getDate().equals(finalPeakDay.toString())) {
                    ds.setIsPeak(true);
                }
            }
            peakDayDto = PeakDayDto.builder()
                    .date(peakDay.toString())
                    .label(peakDay.format(java.time.format.DateTimeFormatter.ofPattern("d MMMM", new java.util.Locale("kk", "KZ"))))
                    .seconds(peakSeconds)
                    .minutes(Math.round((peakSeconds / 60.0) * 10.0) / 10.0)
                    .build();
        }

        int totalListenedDays = (int) dailyList.stream().filter(d -> d.getSeconds() > 0).count();
        double avgDailyMin = totalListenedDays > 0
                ? Math.round(((monthTotalSec / 60.0) / totalListenedDays) * 10.0) / 10.0
                : 0.0;

        // 3. Books breakdown for this reader
        Map<String, Long> bookTodayMap = audioSessionRepository.getUserListeningSumsPerBookSince(userId, todayStart)
                .stream()
                .filter(r -> r != null && r.length >= 2 && r[0] != null)
                .collect(Collectors.toMap(r -> (String) r[0], r -> ((Number) r[1]).longValue(), (a, b) -> a));

        Map<String, Long> bookMonthMap = audioSessionRepository.getUserListeningSumsPerBookBetween(userId, monthStart, monthEnd)
                .stream()
                .filter(r -> r != null && r.length >= 2 && r[0] != null)
                .collect(Collectors.toMap(r -> (String) r[0], r -> ((Number) r[1]).longValue(), (a, b) -> a));

        Map<String, Long> bookAllTimeMap = audioSessionRepository.getUserListeningSumsPerBookAllTime(userId)
                .stream()
                .filter(r -> r != null && r.length >= 2 && r[0] != null)
                .collect(Collectors.toMap(r -> (String) r[0], r -> ((Number) r[1]).longValue(), (a, b) -> a));

        Set<String> bookIds = new LinkedHashSet<>();
        bookIds.addAll(bookTodayMap.keySet());
        bookIds.addAll(bookMonthMap.keySet());
        bookIds.addAll(bookAllTimeMap.keySet());

        List<Book> books = bookRepository.findAllById(bookIds);
        Map<String, Book> bookObjMap = books.stream().collect(Collectors.toMap(Book::getId, b -> b, (a, b) -> a));

        List<ReaderBookListeningDto> bookList = new ArrayList<>();
        for (String bId : bookIds) {
            Book b = bookObjMap.get(bId);
            if (b == null) continue;
            long bTodaySec = bookTodayMap.getOrDefault(bId, 0L);
            long bMonthSec = bookMonthMap.getOrDefault(bId, 0L);
            long bAllSec = bookAllTimeMap.getOrDefault(bId, 0L);

            bookList.add(ReaderBookListeningDto.builder()
                    .bookId(b.getId())
                    .bookTitle(b.getTitle())
                    .bookAuthor(b.getAuthor())
                    .coverImage(b.getCoverImage())
                    .category(b.getCategory())
                    .todaySeconds(bTodaySec)
                    .todayFormatted(formatDuration(bTodaySec))
                    .monthSeconds(bMonthSec)
                    .monthFormatted(formatDuration(bMonthSec))
                    .allTimeSeconds(bAllSec)
                    .allTimeFormatted(formatDuration(bAllSec))
                    .build());
        }

        bookList.sort((a, b) -> Long.compare(b.getAllTimeSeconds(), a.getAllTimeSeconds()));

        boolean isPremium = premiumEntitlementRepository
                .findTopByUserIdAndIsActiveTrueAndExpiresAtAfterOrderByExpiresAtDesc(userId, OffsetDateTime.now())
                .isPresent();

        return ReaderDetailedStatsResponseDto.builder()
                .userId(user.getId())
                .idNumber(user.getIdNumber())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .birthDate(user.getBirthDate())
                .gender(user.getGender())
                .isActive(user.getIsActive())
                .isBlocked(user.getIsBlocked())
                .isPremium(isPremium)
                .createdAt(user.getCreatedAt())
                .selectedMonth(targetMonth)
                .selectedMonthLabel(RoyaltyService.getMonthLabel(targetMonth))
                .todaySeconds(userTodayTotalSec)
                .todayMinutes(Math.round((userTodayTotalSec / 60.0) * 10.0) / 10.0)
                .todayFormatted(formatDuration(userTodayTotalSec))
                .monthSeconds(monthTotalSec)
                .monthMinutes(Math.round((monthTotalSec / 60.0) * 10.0) / 10.0)
                .monthHours(Math.round((monthTotalSec / 3600.0) * 10.0) / 10.0)
                .monthFormatted(formatDuration(monthTotalSec))
                .allTimeSeconds(allTimeSec)
                .allTimeMinutes(Math.round((allTimeSec / 60.0) * 10.0) / 10.0)
                .allTimeHours(Math.round((allTimeSec / 3600.0) * 10.0) / 10.0)
                .allTimeFormatted(formatDuration(allTimeSec))
                .peakDay(peakDayDto)
                .dailyList(dailyList)
                .totalListenedDays(totalListenedDays)
                .averageDailyMinutes(avgDailyMin)
                .books(bookList)
                .build();
    }

    public static String formatDuration(long sec) {
        if (sec <= 0) return "0 сек";
        long hours = sec / 3600;
        long minutes = (sec % 3600) / 60;
        long remSec = sec % 60;
        if (hours > 0) {
            return hours + " сағ" + (minutes > 0 ? " " + minutes + " мин" : "");
        } else if (minutes > 0) {
            return minutes + " мин" + (remSec > 0 ? " " + remSec + " сек" : "");
        } else {
            return sec + " сек";
        }
    }


    private boolean isAudioBook(Book b) {

        if (b == null) return false;
        return Boolean.TRUE.equals(b.getHasAudio()) || (b.getAudioUrl() != null && !b.getAudioUrl().isBlank())
                || (b.getAudioChapters() != null && !b.getAudioChapters().isEmpty());
    }

    private static class BookActivity {
        private final String bookId;
        private final long seconds;
        private final long listens;

        public BookActivity(String bookId, long seconds, long listens) {
            this.bookId = bookId;
            this.seconds = seconds;
            this.listens = listens;
        }

        public long getSeconds() {
            return seconds;
        }

        public long getListens() {
            return listens;
        }
    }

    private static class DailyTopCandidate {
        private final Book book;
        private final long todaySeconds;
        private final long todayListens;

        public DailyTopCandidate(Book book, long todaySeconds, long todayListens) {
            this.book = book;
            this.todaySeconds = todaySeconds;
            this.todayListens = todayListens;
        }
    }
}
