package com.tanda.service;

import com.tanda.dto.audio.AdminAudioBookStatDto;

import com.tanda.dto.audio.AdminAudioStatsResponseDto;
import com.tanda.dto.audio.TopAudioBookResponseDto;
import com.tanda.dto.book.BookStatsResponseDto;
import com.tanda.dto.royalty.AuthorDailyStatDto;
import com.tanda.dto.royalty.PeakDayDto;

import com.tanda.entity.AudioDailyStats;
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.AuthorDailyBookStats;
import com.tanda.entity.Book;
import com.tanda.entity.DailyTopBook;
import com.tanda.entity.User;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioDailyStatsRepository;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorDailyBookStatsRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.DailyTopBookRepository;
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

            dailyList.add(AuthorDailyStatDto.builder()
                    .date(iso)
                    .label(dayNum + "." + monthNum)
                    .shortLabel(dayNum + "." + monthNum)
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

        // Unique listeners
        OffsetDateTime monthStart = startDate.atStartOfDay(KZ_ZONE).toOffsetDateTime();
        OffsetDateTime monthEnd = endDate.plusDays(1).atStartOfDay(KZ_ZONE).toOffsetDateTime();
        long monthUnique = audioSessionRepository.countUniqueListenersByBookIdBetween(bookId, monthStart, monthEnd);
        long allTimeUnique = audioSessionRepository.countUniqueListenersByBookId(bookId);
        if (monthUnique > allTimeUnique) {
            allTimeUnique = monthUnique;
        }

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
                .monthUniqueListeners(monthUnique)
                .allTimeUniqueListeners(allTimeUnique)
                .peakDay(peakDayDto)
                .dailyList(dailyList)
                .totalListenedDays(totalListenedDays)
                .averageDailyMinutes(avgDailyMin)
                .build();
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
