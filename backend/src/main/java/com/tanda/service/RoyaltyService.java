package com.tanda.service;

import com.tanda.dto.leaderboard.DailyActivityDto;
import com.tanda.dto.royalty.AuthorBookItemDto;
import com.tanda.dto.royalty.AuthorDailyStatDto;
import com.tanda.dto.royalty.AuthorEarningSummaryDto;
import com.tanda.dto.royalty.AuthorStatsResponseDto;
import com.tanda.dto.royalty.PayoutRejectRequestDto;
import com.tanda.dto.royalty.PayoutRequestCreateDto;
import com.tanda.dto.royalty.PayoutRequestResponseDto;
import com.tanda.dto.royalty.PeakDayDto;
import com.tanda.dto.royalty.RoyaltyCalculateRequestDto;
import com.tanda.dto.royalty.RoyaltyEarningResponseDto;
import com.tanda.dto.royalty.RoyaltyPeriodResponseDto;
import com.tanda.entity.AudioDailyStats;
import com.tanda.entity.AudioSession;
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.AuthorDailyBookStats;
import com.tanda.entity.Book;
import com.tanda.entity.EbookSession;
import com.tanda.entity.PayoutRequest;
import com.tanda.entity.PayoutTransaction;
import com.tanda.entity.RoyaltyEarning;
import com.tanda.entity.RoyaltyPeriod;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ConflictException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioDailyStatsRepository;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorDailyBookStatsRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.EbookSessionRepository;
import com.tanda.repository.PayoutRequestRepository;
import com.tanda.repository.PayoutTransactionRepository;
import com.tanda.repository.RoyaltyEarningRepository;
import com.tanda.repository.RoyaltyPeriodRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoyaltyService {

    public static final BigDecimal DEFAULT_MAX_RATE_PER_MINUTE = new BigDecimal("10.0000");
    public static final BigDecimal DEFAULT_EBOOK_COEFFICIENT = new BigDecimal("0.50");

    private final RoyaltyPeriodRepository royaltyPeriodRepository;
    private final RoyaltyEarningRepository royaltyEarningRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final PayoutTransactionRepository payoutTransactionRepository;
    private final AuthorRepository authorRepository;
    private final AuthorBookRepository authorBookRepository;
    private final BookRepository bookRepository;
    private final AudioDailyStatsRepository audioDailyStatsRepository;
    private final AuthorDailyBookStatsRepository authorDailyBookStatsRepository;
    private final AudioSessionRepository audioSessionRepository;
    private final EbookSessionRepository ebookSessionRepository;
    private final UserRepository userRepository;

    private static final Map<String, String> MONTH_NAMES_KZ = Map.ofEntries(
            Map.entry("01", "Қаңтар"),
            Map.entry("02", "Ақпан"),
            Map.entry("03", "Наурыз"),
            Map.entry("04", "Сәуір"),
            Map.entry("05", "Мамыр"),
            Map.entry("06", "Маусым"),
            Map.entry("07", "Шілде"),
            Map.entry("08", "Тамыз"),
            Map.entry("09", "Қыркүйек"),
            Map.entry("10", "Қазан"),
            Map.entry("11", "Қараша"),
            Map.entry("12", "Желтоқсан")
    );

    public static String getMonthLabel(String monthKey) {
        String[] parts = monthKey.split("-");
        if (parts.length == 2) {
            String name = MONTH_NAMES_KZ.getOrDefault(parts[1], parts[1]);
            return name + " " + parts[0];
        }
        return monthKey;
    }

    // =========================================================================
    // Admin: Royalty Periods & Calculation
    // =========================================================================

    @Transactional(readOnly = true)
    public List<RoyaltyPeriodResponseDto> getAllPeriods() {
        List<RoyaltyPeriod> periods = royaltyPeriodRepository.findAllByOrderByMonthDesc();
        return periods.stream()
                .map(this::toPeriodDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoyaltyPeriodResponseDto getPeriod(String month) {
        validateMonth(month);
        RoyaltyPeriod period = royaltyPeriodRepository.findByMonth(month).orElse(null);
        if (period == null) {
            return calculatePeriod(month, RoyaltyCalculateRequestDto.builder()
                    .totalRevenue(BigDecimal.ZERO)
                    .adminExpense(BigDecimal.ZERO)
                    .maxRatePerMinute(DEFAULT_MAX_RATE_PER_MINUTE)
                    .ebookRateCoefficient(DEFAULT_EBOOK_COEFFICIENT)
                    .adminNote("")
                    .build());
        }
        if (!"FINALIZED".equalsIgnoreCase(period.getStatus())) {
            return calculatePeriod(month, RoyaltyCalculateRequestDto.builder()
                    .totalRevenue(period.getTotalRevenue() != null ? period.getTotalRevenue() : BigDecimal.ZERO)
                    .adminExpense(period.getAdminExpense() != null ? period.getAdminExpense() : BigDecimal.ZERO)
                    .maxRatePerMinute(period.getMaxRatePerMinute() != null ? period.getMaxRatePerMinute() : DEFAULT_MAX_RATE_PER_MINUTE)
                    .ebookRateCoefficient(period.getEbookRateCoefficient() != null ? period.getEbookRateCoefficient() : DEFAULT_EBOOK_COEFFICIENT)
                    .adminNote(period.getAdminNote() != null ? period.getAdminNote() : "")
                    .build());
        }
        return toPeriodDto(period);
    }

    @Transactional
    public RoyaltyPeriodResponseDto calculatePeriod(String month, RoyaltyCalculateRequestDto request) {
        validateMonth(month);

        RoyaltyPeriod existingPeriod = royaltyPeriodRepository.findByMonth(month).orElse(null);
        if (existingPeriod != null && "FINALIZED".equalsIgnoreCase(existingPeriod.getStatus())) {
            throw new ConflictException("Бекітілген кезеңді қайта есептеуге болмайды: " + month);
        }

        YearMonth ym = YearMonth.parse(month);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();
        ZoneId almatyZone = ZoneId.of("Asia/Almaty");
        OffsetDateTime monthStart = ym.atDay(1).atStartOfDay(almatyZone).toOffsetDateTime();
        OffsetDateTime monthEnd = ym.plusMonths(1).atDay(1).atStartOfDay(almatyZone).toOffsetDateTime();

        // 1. Audio & E-book statistics for this month from daily snapshots and live sessions
        List<AudioDailyStats> dailyStats = audioDailyStatsRepository.findByStatDateBetween(startDate, endDate);
        Map<String, Long> bookSecondsMap = new HashMap<>();
        Map<String, Long> bookReadingSecondsMap = new HashMap<>();
        for (AudioDailyStats s : dailyStats) {
            String bId = s.getBook().getId();
            long audioSec = s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L;
            long readSec = s.getReadingSeconds() != null ? s.getReadingSeconds() : 0L;
            bookSecondsMap.put(bId, bookSecondsMap.getOrDefault(bId, 0L) + audioSec);
            bookReadingSecondsMap.put(bId, bookReadingSecondsMap.getOrDefault(bId, 0L) + readSec);
        }

        List<Object[]> liveBookStats = audioSessionRepository.findTopAudioSessionsBetween(monthStart, monthEnd, Pageable.unpaged());
        for (Object[] row : liveBookStats) {
            String bId = (String) row[0];
            long sec = ((Number) row[2]).longValue();
            bookSecondsMap.put(bId, Math.max(bookSecondsMap.getOrDefault(bId, 0L), sec));
        }

        List<Object[]> liveEbookStats = ebookSessionRepository.findTopEbookSessionsBetween(monthStart, monthEnd, Pageable.unpaged());
        for (Object[] row : liveEbookStats) {
            String bId = (String) row[0];
            long sec = ((Number) row[2]).longValue();
            bookReadingSecondsMap.put(bId, Math.max(bookReadingSecondsMap.getOrDefault(bId, 0L), sec));
        }

        // 2. Authors and book assignments
        List<Author> authors = authorRepository.findAll();
        List<AuthorBook> allAuthorBooks = authorBookRepository.findAll();
        Map<String, List<AuthorBook>> authorBooksMap = allAuthorBooks.stream()
                .collect(Collectors.groupingBy(AuthorBook::getAuthorId));

        Map<String, Book> allBooks = bookRepository.findAll().stream()
                .collect(Collectors.toMap(Book::getId, b -> b));

        // 3. Financial pools & configurable rates
        BigDecimal revenue = (request != null && request.getTotalRevenue() != null)
                ? request.getTotalRevenue().max(BigDecimal.ZERO)
                : (existingPeriod != null && existingPeriod.getTotalRevenue() != null ? existingPeriod.getTotalRevenue() : BigDecimal.ZERO);
        BigDecimal expense = (request != null && request.getAdminExpense() != null)
                ? request.getAdminExpense().max(BigDecimal.ZERO)
                : (existingPeriod != null && existingPeriod.getAdminExpense() != null ? existingPeriod.getAdminExpense() : BigDecimal.ZERO);
        String note = (request != null && request.getAdminNote() != null)
                ? request.getAdminNote()
                : (existingPeriod != null && existingPeriod.getAdminNote() != null ? existingPeriod.getAdminNote() : "");

        BigDecimal maxRatePerMinute = DEFAULT_MAX_RATE_PER_MINUTE;
        if (request != null && request.getMaxRatePerMinute() != null && request.getMaxRatePerMinute().compareTo(BigDecimal.ZERO) > 0) {
            maxRatePerMinute = request.getMaxRatePerMinute().setScale(4, RoundingMode.HALF_UP);
        } else if (existingPeriod != null && existingPeriod.getMaxRatePerMinute() != null && existingPeriod.getMaxRatePerMinute().compareTo(BigDecimal.ZERO) > 0) {
            maxRatePerMinute = existingPeriod.getMaxRatePerMinute().setScale(4, RoundingMode.HALF_UP);
        }

        BigDecimal ebookRateCoefficient = DEFAULT_EBOOK_COEFFICIENT;
        if (request != null && request.getEbookRateCoefficient() != null && request.getEbookRateCoefficient().compareTo(BigDecimal.ZERO) > 0) {
            ebookRateCoefficient = request.getEbookRateCoefficient().setScale(2, RoundingMode.HALF_UP);
        } else if (existingPeriod != null && existingPeriod.getEbookRateCoefficient() != null && existingPeriod.getEbookRateCoefficient().compareTo(BigDecimal.ZERO) > 0) {
            ebookRateCoefficient = existingPeriod.getEbookRateCoefficient().setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal netPool = revenue.subtract(expense).max(BigDecimal.ZERO);
        BigDecimal baseCompanyShare = netPool.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal royaltyPool = netPool.subtract(baseCompanyShare);

        // 4. Calculate author listening & reading minutes
        long totalPlatformAudioMinutes = 0L;
        long totalPlatformReadingMinutes = 0L;
        Map<String, Map<String, Long>> authorBookMinutesMap = new HashMap<>();
        Map<String, Map<String, Long>> authorBookReadingMinutesMap = new HashMap<>();

        List<AuthorDailyBookStats> monthlyDailyAuthorStats = authorDailyBookStatsRepository.findByStatDateBetween(startDate, endDate);
        Map<String, Map<String, Long>> authorBookSecFromDaily = new HashMap<>();
        Map<String, Map<String, Long>> authorBookReadSecFromDaily = new HashMap<>();
        for (AuthorDailyBookStats st : monthlyDailyAuthorStats) {
            authorBookSecFromDaily
                    .computeIfAbsent(st.getAuthorId(), k -> new HashMap<>())
                    .merge(st.getBookId(), st.getTotalSeconds() != null ? st.getTotalSeconds() : 0L, Long::sum);
            authorBookReadSecFromDaily
                    .computeIfAbsent(st.getAuthorId(), k -> new HashMap<>())
                    .merge(st.getBookId(), st.getReadingSeconds() != null ? st.getReadingSeconds() : 0L, Long::sum);
        }

        for (Author author : authors) {
            String authorId = author.getId();
            List<AuthorBook> explicitAssignments = authorBooksMap.getOrDefault(authorId, Collections.emptyList());
            Set<String> assignedBookIds = explicitAssignments.stream()
                    .map(AuthorBook::getBookId)
                    .collect(Collectors.toSet());

            if (authorBookSecFromDaily.containsKey(authorId)) {
                assignedBookIds.addAll(authorBookSecFromDaily.get(authorId).keySet());
            }
            if (authorBookReadSecFromDaily.containsKey(authorId)) {
                assignedBookIds.addAll(authorBookReadSecFromDaily.get(authorId).keySet());
            }

            Map<String, BigDecimal> shareMap = explicitAssignments.stream()
                    .collect(Collectors.toMap(AuthorBook::getBookId, AuthorBook::getRoyaltyShare, (s1, s2) -> s1));

            String matchName = author.getDisplayName() != null ? author.getDisplayName().toLowerCase().trim() : "";
            for (Book b : allBooks.values()) {
                if (!assignedBookIds.contains(b.getId()) && b.getAuthor() != null) {
                    if (b.getAuthor().toLowerCase().trim().equals(matchName)) {
                        assignedBookIds.add(b.getId());
                        shareMap.put(b.getId(), new BigDecimal("100.00"));
                    }
                }
            }

            Map<String, Long> authorBooksResult = new HashMap<>();
            Map<String, Long> authorBooksReadingResult = new HashMap<>();
            for (String bookId : assignedBookIds) {
                long liveBookSec = bookSecondsMap.getOrDefault(bookId, 0L);
                long dailyAuthorSec = (authorBookSecFromDaily.containsKey(authorId) && authorBookSecFromDaily.get(authorId).containsKey(bookId))
                        ? authorBookSecFromDaily.get(authorId).get(bookId)
                        : 0L;
                long sec = Math.max(liveBookSec, dailyAuthorSec);
                long min = sec / 60;

                long liveReadSec = bookReadingSecondsMap.getOrDefault(bookId, 0L);
                long dailyAuthorReadSec = (authorBookReadSecFromDaily.containsKey(authorId) && authorBookReadSecFromDaily.get(authorId).containsKey(bookId))
                        ? authorBookReadSecFromDaily.get(authorId).get(bookId)
                        : 0L;
                long readSec = Math.max(liveReadSec, dailyAuthorReadSec);
                long readMin = readSec / 60;

                BigDecimal share = shareMap.getOrDefault(bookId, new BigDecimal("100.00"));
                long authorMin = (long) Math.floor(min * (share.doubleValue() / 100.0));
                long authorReadMin = (long) Math.floor(readMin * (share.doubleValue() / 100.0));

                authorBooksResult.put(bookId, authorMin);
                authorBooksReadingResult.put(bookId, authorReadMin);
                totalPlatformAudioMinutes += authorMin;
                totalPlatformReadingMinutes += authorReadMin;
            }
            authorBookMinutesMap.put(authorId, authorBooksResult);
            authorBookReadingMinutesMap.put(authorId, authorBooksReadingResult);
        }

        long totalCombinedPlatformMinutes = totalPlatformAudioMinutes + totalPlatformReadingMinutes;
        BigDecimal rawRatePerMinute = totalCombinedPlatformMinutes > 0
                ? royaltyPool.divide(BigDecimal.valueOf(totalCombinedPlatformMinutes), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal ratePerMinute = rawRatePerMinute.min(maxRatePerMinute);
        BigDecimal ebookRatePerMinute = ratePerMinute.multiply(ebookRateCoefficient).setScale(4, RoundingMode.HALF_UP);

        // 5. Persist earnings and compute actual author payout + retained companyShare
        RoyaltyPeriod period = existingPeriod != null ? existingPeriod : new RoyaltyPeriod();
        period.setId(month);
        period.setMonth(month);
        period.setStatus("CALCULATED");
        period.setTotalRevenue(revenue);
        period.setAdminExpense(expense);
        period.setNetPool(netPool);
        period.setRoyaltyPool(royaltyPool);
        period.setTotalMinutes(totalPlatformAudioMinutes);
        period.setTotalReadingMinutes(totalPlatformReadingMinutes);
        period.setRatePerMinute(ratePerMinute);
        period.setMaxRatePerMinute(maxRatePerMinute);
        period.setEbookRateCoefficient(ebookRateCoefficient);
        period.setEbookRatePerMinute(ebookRatePerMinute);
        period.setAdminNote(note);
        period.setCalculatedAt(OffsetDateTime.now());

        royaltyEarningRepository.deleteByPeriodId(period.getId());

        List<RoyaltyEarning> earningsToSave = new ArrayList<>();
        BigDecimal totalAuthorRoyaltiesPaid = BigDecimal.ZERO;

        for (Author author : authors) {
            String authorId = author.getId();
            Map<String, Long> bookMins = authorBookMinutesMap.getOrDefault(authorId, Collections.emptyMap());
            Map<String, Long> bookReadMins = authorBookReadingMinutesMap.getOrDefault(authorId, Collections.emptyMap());
            Set<String> allAuthorBookKeys = new HashSet<>(bookMins.keySet());
            allAuthorBookKeys.addAll(bookReadMins.keySet());

            for (String bookId : allAuthorBookKeys) {
                long minutes = bookMins.getOrDefault(bookId, 0L);
                long readMinutes = bookReadMins.getOrDefault(bookId, 0L);
                BigDecimal audioAmount = ratePerMinute.multiply(BigDecimal.valueOf(minutes));
                BigDecimal ebookAmount = ebookRatePerMinute.multiply(BigDecimal.valueOf(readMinutes));
                BigDecimal amount = audioAmount.add(ebookAmount).setScale(2, RoundingMode.HALF_UP);
                totalAuthorRoyaltiesPaid = totalAuthorRoyaltiesPaid.add(amount);

                RoyaltyEarning earning = RoyaltyEarning.builder()
                        .id("earn-" + UUID.randomUUID().toString().substring(0, 12))
                        .periodId(period.getId())
                        .authorId(authorId)
                        .bookId(bookId)
                        .minutesListened(minutes)
                        .minutesRead(readMinutes)
                        .amount(amount)
                        .status("CALCULATED")
                        .build();
                earningsToSave.add(earning);
            }
        }

        // Savings from the maxRatePerMinute cap and 0.5x e-book coefficient stay in companyShare
        BigDecimal companyShare = baseCompanyShare;
        if (netPool.compareTo(BigDecimal.ZERO) > 0 && totalCombinedPlatformMinutes > 0) {
            companyShare = netPool.subtract(totalAuthorRoyaltiesPaid).max(baseCompanyShare).setScale(2, RoundingMode.HALF_UP);
        }
        period.setCompanyShare(companyShare);

        period = royaltyPeriodRepository.save(period);
        royaltyEarningRepository.saveAll(earningsToSave);

        log.info("Royalty period {} calculated: revenue={}, netPool={}, companyShare={}, audioMin={}, readMin={}, audioRate={}, ebookRate={}",
                month, revenue, netPool, companyShare, totalPlatformAudioMinutes, totalPlatformReadingMinutes, ratePerMinute, ebookRatePerMinute);

        return toPeriodDto(period);
    }

    @Transactional
    public RoyaltyPeriodResponseDto finalizePeriod(String month) {
        validateMonth(month);

        RoyaltyPeriod period = royaltyPeriodRepository.findByMonth(month)
                .orElseThrow(() -> new ResourceNotFoundException("Роялти кезеңі табылмады: " + month));

        if ("FINALIZED".equalsIgnoreCase(period.getStatus())) {
            throw new ConflictException("Бұл кезең бұрыннан бекітілген: " + month);
        }

        List<RoyaltyEarning> earnings = royaltyEarningRepository.findByPeriodId(period.getId());

        // Update author balances
        Map<String, BigDecimal> authorEarningsSum = new HashMap<>();
        for (RoyaltyEarning e : earnings) {
            e.setStatus("PAID");
            authorEarningsSum.put(e.getAuthorId(),
                    authorEarningsSum.getOrDefault(e.getAuthorId(), BigDecimal.ZERO).add(e.getAmount()));
        }
        royaltyEarningRepository.saveAll(earnings);

        for (Map.Entry<String, BigDecimal> entry : authorEarningsSum.entrySet()) {
            authorRepository.findById(entry.getKey()).ifPresent(author -> {
                BigDecimal currentBalance = author.getBalance() != null ? author.getBalance() : BigDecimal.ZERO;
                author.setBalance(currentBalance.add(entry.getValue()));
                authorRepository.save(author);
                log.info("Author {} balance updated: +{} -> {}", author.getId(), entry.getValue(), author.getBalance());
            });
        }

        period.setStatus("FINALIZED");
        period.setFinalizedAt(OffsetDateTime.now());
        period = royaltyPeriodRepository.save(period);

        log.info("Royalty period {} finalized successfully.", month);
        return toPeriodDto(period);
    }

    @Transactional(readOnly = true)
    public List<RoyaltyEarningResponseDto> getPeriodEarnings(String month) {
        RoyaltyPeriod period = royaltyPeriodRepository.findByMonth(month)
                .orElseThrow(() -> new ResourceNotFoundException("Роялти кезеңі табылмады: " + month));

        List<RoyaltyEarning> earnings = royaltyEarningRepository.findByPeriodId(period.getId());
        return mapEarningsToDtos(earnings);
    }

    // =========================================================================
    // Author & Admin: Author Stats & Earnings
    // =========================================================================

    @Transactional(readOnly = true)
    public List<RoyaltyEarningResponseDto> getAuthorEarnings(String authorUserIdOrId) {
        Author author = resolveAuthor(authorUserIdOrId);
        List<RoyaltyEarning> earnings = royaltyEarningRepository.findByAuthorIdOrderByCreatedAtDesc(author.getId());
        return mapEarningsToDtos(earnings);
    }

    @Transactional(readOnly = true)
    public AuthorStatsResponseDto getAuthorStats(String authorUserIdOrId, String monthKey) {
        Author author = resolveAuthor(authorUserIdOrId);
        String targetMonth = (monthKey != null && !monthKey.isBlank()) ? monthKey : getCurrentMonthKey();
        validateMonth(targetMonth);

        YearMonth ym = YearMonth.parse(targetMonth);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();
        ZoneId almatyZone = ZoneId.of("Asia/Almaty");
        OffsetDateTime monthStart = ym.atDay(1).atStartOfDay(almatyZone).toOffsetDateTime();
        OffsetDateTime monthEnd = ym.plusMonths(1).atDay(1).atStartOfDay(almatyZone).toOffsetDateTime();

        // 1. Author's books (active + historical for target month)
        List<AuthorBook> activeAssignments = authorBookRepository.findByAuthorIdAndIsActiveTrue(author.getId());
        Set<String> authorBookIds = activeAssignments.stream().map(AuthorBook::getBookId).collect(Collectors.toSet());

        List<AuthorDailyBookStats> authorSpecificStats = authorDailyBookStatsRepository.findByAuthorIdAndStatDateBetween(author.getId(), startDate, endDate);
        Set<String> historicalBookIds = authorSpecificStats.stream().map(AuthorDailyBookStats::getBookId).collect(Collectors.toSet());
        authorBookIds.addAll(historicalBookIds);

        String matchName = author.getDisplayName() != null ? author.getDisplayName().toLowerCase().trim() : "";
        List<Book> allBooks = bookRepository.findAll();
        List<Book> matchedBooks = allBooks.stream()
                .filter(b -> authorBookIds.contains(b.getId())
                        || (b.getAuthor() != null && b.getAuthor().toLowerCase().trim().equals(matchName)))
                .collect(Collectors.toList());

        List<String> matchedIds = matchedBooks.stream().map(Book::getId).collect(Collectors.toList());

        Map<String, Long> dateSecondsMap = new HashMap<>();
        Map<String, Long> bookSecondsMap = new HashMap<>();
        Map<String, Long> bookReadingSecondsMap = new HashMap<>();
        Set<String> coveredBookDates = new HashSet<>();
        Set<String> coveredReadBookDates = new HashSet<>();
        OffsetDateTime latestListenedAt = null;

        if (!matchedIds.isEmpty()) {
            List<AudioSession> liveSessions = audioSessionRepository.findSessionsForBooksBetween(matchedIds, monthStart, monthEnd);
            for (AudioSession s : liveSessions) {
                String bId = s.getBook().getId();
                LocalDate sessionDate = s.getStartedAt().atZoneSameInstant(almatyZone).toLocalDate();
                String dateStr = sessionDate.toString();
                long sec = s.getValidSeconds() != null ? s.getValidSeconds() : 0L;

                dateSecondsMap.put(dateStr, dateSecondsMap.getOrDefault(dateStr, 0L) + sec);
                bookSecondsMap.put(bId, bookSecondsMap.getOrDefault(bId, 0L) + sec);
                coveredBookDates.add(bId + "_" + dateStr);

                OffsetDateTime sessionTime = s.getLastHeartbeatAt() != null ? s.getLastHeartbeatAt() : s.getStartedAt();
                if (sessionTime != null && (latestListenedAt == null || sessionTime.isAfter(latestListenedAt))) {
                    latestListenedAt = sessionTime;
                }
            }

            List<EbookSession> liveReadSessions = ebookSessionRepository.findSessionsForBooksBetween(matchedIds, monthStart, monthEnd);
            for (EbookSession es : liveReadSessions) {
                String bId = es.getBook().getId();
                LocalDate sessionDate = es.getStartedAt().atZoneSameInstant(almatyZone).toLocalDate();
                String dateStr = sessionDate.toString();
                long readSec = es.getCreditedSeconds() != null ? es.getCreditedSeconds() : 0L;
                if (readSec > 0) {
                    bookReadingSecondsMap.put(bId, bookReadingSecondsMap.getOrDefault(bId, 0L) + readSec);
                    coveredReadBookDates.add(bId + "_" + dateStr);
                }
            }
        }

        for (AuthorDailyBookStats s : authorSpecificStats) {
            String bId = s.getBookId();
            String dateStr = s.getStatDate().toString();
            if (!coveredBookDates.contains(bId + "_" + dateStr)) {
                long sec = s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L;
                dateSecondsMap.put(dateStr, dateSecondsMap.getOrDefault(dateStr, 0L) + sec);
                bookSecondsMap.put(bId, bookSecondsMap.getOrDefault(bId, 0L) + sec);
                coveredBookDates.add(bId + "_" + dateStr);

                if (s.getUpdatedAt() != null && (latestListenedAt == null || s.getUpdatedAt().isAfter(latestListenedAt))) {
                    latestListenedAt = s.getUpdatedAt();
                }
            }
            if (!coveredReadBookDates.contains(bId + "_" + dateStr)) {
                long readSec = s.getReadingSeconds() != null ? s.getReadingSeconds() : 0L;
                if (readSec > 0) {
                    bookReadingSecondsMap.put(bId, bookReadingSecondsMap.getOrDefault(bId, 0L) + readSec);
                    coveredReadBookDates.add(bId + "_" + dateStr);
                }
            }
        }

        // Fallback for legacy audioDailyStats for any book-date not recorded in authorSpecificStats
        if (!matchedIds.isEmpty()) {
            List<AudioDailyStats> dailyStats = audioDailyStatsRepository.findByBookIdInAndStatDateBetween(matchedIds, startDate, endDate);
            for (AudioDailyStats s : dailyStats) {
                String bId = s.getBook().getId();
                String dateStr = s.getStatDate().toString();
                if (!coveredBookDates.contains(bId + "_" + dateStr)) {
                    long sec = s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L;
                    dateSecondsMap.put(dateStr, dateSecondsMap.getOrDefault(dateStr, 0L) + sec);
                    bookSecondsMap.put(bId, bookSecondsMap.getOrDefault(bId, 0L) + sec);

                    if (s.getUpdatedAt() != null && (latestListenedAt == null || s.getUpdatedAt().isAfter(latestListenedAt))) {
                        latestListenedAt = s.getUpdatedAt();
                    }
                }
                if (!coveredReadBookDates.contains(bId + "_" + dateStr)) {
                    long readSec = s.getReadingSeconds() != null ? s.getReadingSeconds() : 0L;
                    if (readSec > 0) {
                        bookReadingSecondsMap.put(bId, bookReadingSecondsMap.getOrDefault(bId, 0L) + readSec);
                    }
                }
            }
        }

        Map<String, Long> bookMinutesMap = new HashMap<>();
        for (Map.Entry<String, Long> entry : bookSecondsMap.entrySet()) {
            bookMinutesMap.put(entry.getKey(), entry.getValue() / 60);
        }

        Map<String, Long> bookReadingMinutesMap = new HashMap<>();
        long monthTotalReadSec = 0L;
        for (Map.Entry<String, Long> entry : bookReadingSecondsMap.entrySet()) {
            bookReadingMinutesMap.put(entry.getKey(), entry.getValue() / 60);
            monthTotalReadSec += entry.getValue();
        }

        // 3. Build day list
        LocalDate today = LocalDate.now();
        int daysInMonth = ym.lengthOfMonth();
        List<AuthorDailyStatDto> dailyList = new ArrayList<>(daysInMonth);

        long monthTotalSec = 0L;
        long maxSecInPeriod = 0L;
        String peakDateStr = null;
        long peakSec = 0L;

        for (int day = 1; day <= daysInMonth; day++) {
            LocalDate date = ym.atDay(day);
            String iso = date.toString();
            long sec = dateSecondsMap.getOrDefault(iso, 0L);
            if (sec > maxSecInPeriod) {
                maxSecInPeriod = sec;
            }
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

        long totalListenedDays = dailyList.stream().filter(d -> d.getSeconds() > 0).count();
        double avgMin = totalListenedDays > 0
                ? Math.round(((monthTotalSec / 60.0) / totalListenedDays) * 10.0) / 10.0
                : 0.0;

        // 4. Period & Rate
        RoyaltyPeriod period = royaltyPeriodRepository.findByMonth(targetMonth).orElse(null);
        BigDecimal rate = (period != null && period.getRatePerMinute() != null) ? period.getRatePerMinute() : BigDecimal.ZERO;
        BigDecimal ebookRate = (period != null && period.getEbookRatePerMinute() != null && period.getEbookRatePerMinute().compareTo(BigDecimal.ZERO) > 0)
                ? period.getEbookRatePerMinute()
                : rate.multiply(DEFAULT_EBOOK_COEFFICIENT).setScale(4, RoundingMode.HALF_UP);

        long authorMonthMinutes = monthTotalSec / 60;
        long authorMonthReadMinutes = monthTotalReadSec / 60;
        BigDecimal estimatedEarned = rate.multiply(BigDecimal.valueOf(authorMonthMinutes))
                .add(ebookRate.multiply(BigDecimal.valueOf(authorMonthReadMinutes)))
                .setScale(2, RoundingMode.HALF_UP);

        String periodStatus = "estimated";
        if (period != null) {
            periodStatus = "FINALIZED".equalsIgnoreCase(period.getStatus()) ? "paid" : "calculated";
        }

        // 5. Author Book Item DTOs:
        // Include all non-deleted books (both active and archived),
        // plus any deleted book that has listening or reading activity (> 0 sec) in the target month.
        List<AuthorBookItemDto> bookItems = matchedBooks.stream()
                .filter(b -> !Boolean.TRUE.equals(b.getIsDeleted())
                        || bookSecondsMap.getOrDefault(b.getId(), 0L) > 0L
                        || bookReadingSecondsMap.getOrDefault(b.getId(), 0L) > 0L)
                .map(b -> AuthorBookItemDto.builder()
                        .id(b.getId())
                        .title(b.getTitle())
                        .author(b.getAuthor())
                        .coverUrl(b.getCoverImage())
                        .category(b.getCategory())
                        .gradient(b.getGradient())
                        .pages(b.getPages())
                        .viewsCount(0L)
                        .readsCount(0L)
                        .totalMinutes(bookMinutesMap.getOrDefault(b.getId(), 0L))
                        .totalSeconds(bookSecondsMap.getOrDefault(b.getId(), 0L))
                        .readingMinutes(bookReadingMinutesMap.getOrDefault(b.getId(), 0L))
                        .readingSeconds(bookReadingSecondsMap.getOrDefault(b.getId(), 0L))
                        .savedCount(0L)
                        .hasAudio(Boolean.TRUE.equals(b.getHasAudio()) || (b.getAudioUrl() != null && !b.getAudioUrl().isBlank()))
                        .hasEbook(Boolean.TRUE.equals(b.getHasEbook()) || (b.getEbookUrl() != null && !b.getEbookUrl().isBlank()))
                        .audioUrl(b.getAudioUrl())
                        .audioDuration(b.getAudioDuration())
                        .isArchived(Boolean.TRUE.equals(b.getIsArchived()))
                        .isDeleted(Boolean.TRUE.equals(b.getIsDeleted()))
                        .isFree(b.getIsFree() != null ? b.getIsFree() : true)
                        .build()
                ).collect(Collectors.toList());

        return AuthorStatsResponseDto.builder()
                .authorId(authorUserIdOrId != null && !authorUserIdOrId.isBlank() ? authorUserIdOrId : author.getId())
                .authorName(author.getDisplayName())
                .month(targetMonth)
                .authorBooks(bookItems)
                .totalMinutes(authorMonthMinutes)
                .totalSeconds(monthTotalSec)
                .readingMinutes(authorMonthReadMinutes)
                .readingSeconds(monthTotalReadSec)
                .estimatedEarned(estimatedEarned)
                .ratePerMinute(rate)
                .ebookRatePerMinute(ebookRate)
                .currentBalance(author.getBalance() != null ? author.getBalance() : BigDecimal.ZERO)
                .periodStatus(periodStatus)
                .dailyList(dailyList)
                .peakDay(peakDayDto)
                .peakMinutes(peakDayDto != null ? peakDayDto.getMinutes() : 0.0)
                .peakSeconds(peakSec)
                .totalListenedDays((int) totalListenedDays)
                .averageMinutes(avgMin)
                .lastListenedAt(latestListenedAt)
                .build();
    }

    // =========================================================================
    // Payout Requests
    // =========================================================================

    @Transactional
    public PayoutRequestResponseDto requestPayout(String authorUserIdOrId, PayoutRequestCreateDto request) {
        Author author = resolveAuthor(authorUserIdOrId);

        BigDecimal currentBalance = author.getBalance() != null ? author.getBalance() : BigDecimal.ZERO;
        BigDecimal amount = request.getAmount();

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Шығару сомасы 0-ден көп болуы тиіс");
        }
        if (amount.compareTo(currentBalance) > 0) {
            throw new BadRequestException("Шығару сомасы қолжетімді баланстан аспауы тиіс. Баланс: "
                    + currentBalance + " ₸, сұралған: " + amount + " ₸");
        }

        // Deduct from balance immediately to reserve the funds
        author.setBalance(currentBalance.subtract(amount));
        authorRepository.save(author);

        PayoutRequest payout = PayoutRequest.builder()
                .id("PO-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                .authorId(author.getId())
                .amount(amount)
                .method(request.getMethod() != null ? request.getMethod().trim() : "Kaspi Gold")
                .cardOrAccount(request.getCardOrAccount() != null ? request.getCardOrAccount().trim() : null)
                .status("REQUESTED")
                .requestedAt(OffsetDateTime.now())
                .build();

        payout = payoutRequestRepository.save(payout);
        log.info("Payout requested: id={}, authorId={}, amount={}, newBalance={}",
                payout.getId(), author.getId(), amount, author.getBalance());

        return toPayoutDto(payout, author);
    }

    @Transactional(readOnly = true)
    public List<PayoutRequestResponseDto> getAuthorPayouts(String authorUserIdOrId) {
        Author author = resolveAuthor(authorUserIdOrId);
        List<PayoutRequest> requests = payoutRequestRepository.findByAuthorIdOrderByRequestedAtDesc(author.getId());
        return requests.stream()
                .map(p -> toPayoutDto(p, author))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PayoutRequestResponseDto> getAllPayouts() {
        List<PayoutRequest> requests = payoutRequestRepository.findAllByOrderByRequestedAtDesc();
        Map<String, Author> authorMap = authorRepository.findAll().stream()
                .collect(Collectors.toMap(Author::getId, a -> a));

        return requests.stream()
                .map(p -> toPayoutDto(p, authorMap.get(p.getAuthorId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public PayoutRequestResponseDto approvePayout(String payoutId) {
        PayoutRequest payout = payoutRequestRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Төлем сұранысы табылмады id: " + payoutId));

        if ("COMPLETED".equalsIgnoreCase(payout.getStatus())) {
            throw new BadRequestException("Бұл төлем сұранысы бұрыннан орындалған");
        }
        if ("REJECTED".equalsIgnoreCase(payout.getStatus())) {
            throw new BadRequestException("Бас тартылған төлем сұранысын мақұлдауға болмайды");
        }

        payout.setStatus("COMPLETED");
        payout.setProcessedAt(OffsetDateTime.now());
        payout = payoutRequestRepository.save(payout);

        PayoutTransaction tx = PayoutTransaction.builder()
                .id("tx-" + UUID.randomUUID().toString().substring(0, 12))
                .payoutRequestId(payout.getId())
                .reference("TRX-" + System.currentTimeMillis())
                .processedAt(OffsetDateTime.now())
                .build();
        payoutTransactionRepository.save(tx);

        Author author = authorRepository.findById(payout.getAuthorId()).orElse(null);
        log.info("Payout approved: id={}, authorId={}, amount={}", payout.getId(), payout.getAuthorId(), payout.getAmount());
        return toPayoutDto(payout, author);
    }

    @Transactional
    public PayoutRequestResponseDto rejectPayout(String payoutId, PayoutRejectRequestDto request) {
        PayoutRequest payout = payoutRequestRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Төлем сұранысы табылмады id: " + payoutId));

        if ("COMPLETED".equalsIgnoreCase(payout.getStatus())) {
            throw new BadRequestException("Орындалған төлем сұранысынан бас тартуға болмайды");
        }
        if ("REJECTED".equalsIgnoreCase(payout.getStatus())) {
            throw new BadRequestException("Бұл төлем сұранысы бұрыннан бас тартылған");
        }

        // Refund author balance
        Author author = authorRepository.findById(payout.getAuthorId()).orElse(null);
        if (author != null) {
            BigDecimal current = author.getBalance() != null ? author.getBalance() : BigDecimal.ZERO;
            author.setBalance(current.add(payout.getAmount()));
            authorRepository.save(author);
        }

        String reason = (request != null && request.getReason() != null) ? request.getReason().trim() : "Бас тартылды";
        payout.setStatus("REJECTED");
        payout.setRejectionReason(reason);
        payout.setProcessedAt(OffsetDateTime.now());
        payout = payoutRequestRepository.save(payout);

        log.info("Payout rejected: id={}, authorId={}, refundAmount={}, reason={}",
                payout.getId(), payout.getAuthorId(), payout.getAmount(), reason);
        return toPayoutDto(payout, author);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    public Author resolveAuthor(String authorUserIdOrId) {
        if (authorUserIdOrId == null || authorUserIdOrId.isBlank()) {
            throw new ResourceNotFoundException("Автор сәйкестендіргіші көрсетілмеген");
        }
        return authorRepository.findById(authorUserIdOrId)
                .or(() -> authorRepository.findByUserId(authorUserIdOrId))
                .orElseThrow(() -> new ResourceNotFoundException("Автор табылмады: " + authorUserIdOrId));
    }

    private void validateMonth(String month) {
        if (month == null || !month.matches("^\\d{4}-\\d{2}$")) {
            throw new BadRequestException("Ай форматы дұрыс емес (YYYY-MM болуы қажет): " + month);
        }
    }

    private String getCurrentMonthKey() {
        LocalDate now = LocalDate.now();
        return String.format("%04d-%02d", now.getYear(), now.getMonthValue());
    }

    private RoyaltyPeriodResponseDto toPeriodDto(RoyaltyPeriod p) {
        YearMonth ym = YearMonth.parse(p.getMonth());
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();

        // 1. Live stats from author_daily_book_stats across all books
        List<AuthorDailyBookStats> monthlyDailyAuthorStats = authorDailyBookStatsRepository.findByStatDateBetween(startDate, endDate);
        Map<String, Long> authorLiveSecondsSum = new HashMap<>();
        Map<String, Long> authorLiveReadingSecondsSum = new HashMap<>();
        for (AuthorDailyBookStats st : monthlyDailyAuthorStats) {
            authorLiveSecondsSum.merge(
                    st.getAuthorId(),
                    st.getTotalSeconds() != null ? st.getTotalSeconds() : 0L,
                    Long::sum
            );
            authorLiveReadingSecondsSum.merge(
                    st.getAuthorId(),
                    st.getReadingSeconds() != null ? st.getReadingSeconds() : 0L,
                    Long::sum
            );
        }

        List<RoyaltyEarning> earnings = royaltyEarningRepository.findByPeriodId(p.getId());
        List<RoyaltyEarningResponseDto> earningDtos = mapEarningsToDtos(earnings);

        // Summarize per author
        Map<String, Author> authorMap = authorRepository.findAll().stream()
                .collect(Collectors.toMap(Author::getId, a -> a));
        Map<String, Book> allBooksMap = bookRepository.findAll().stream()
                .collect(Collectors.toMap(Book::getId, b -> b));
        List<AuthorBook> allAuthorBooks = authorBookRepository.findAll();
        Map<String, List<AuthorBook>> authorBooksByAuthor = allAuthorBooks.stream()
                .collect(Collectors.groupingBy(AuthorBook::getAuthorId));

        Map<String, Set<String>> authorPeriodListenedBookIds = new HashMap<>();
        for (AuthorDailyBookStats st : monthlyDailyAuthorStats) {
            if ((st.getTotalSeconds() != null && st.getTotalSeconds() > 0)
                    || (st.getReadingSeconds() != null && st.getReadingSeconds() > 0)) {
                authorPeriodListenedBookIds
                        .computeIfAbsent(st.getAuthorId(), k -> new HashSet<>())
                        .add(st.getBookId());
            }
        }

        Map<String, Long> authorMinutesSum = new HashMap<>();
        Map<String, Long> authorReadingMinutesSum = new HashMap<>();
        Map<String, BigDecimal> authorEarnedSum = new HashMap<>();

        for (RoyaltyEarning e : earnings) {
            long minListened = e.getMinutesListened() != null ? e.getMinutesListened() : 0L;
            long minRead = e.getMinutesRead() != null ? e.getMinutesRead() : 0L;
            authorMinutesSum.put(e.getAuthorId(),
                    authorMinutesSum.getOrDefault(e.getAuthorId(), 0L) + minListened);
            authorReadingMinutesSum.put(e.getAuthorId(),
                    authorReadingMinutesSum.getOrDefault(e.getAuthorId(), 0L) + minRead);
            authorEarnedSum.put(e.getAuthorId(),
                    authorEarnedSum.getOrDefault(e.getAuthorId(), BigDecimal.ZERO).add(e.getAmount()));
            if (minListened > 0 || minRead > 0) {
                authorPeriodListenedBookIds
                        .computeIfAbsent(e.getAuthorId(), k -> new HashSet<>())
                        .add(e.getBookId());
            }
        }

        BigDecimal effectiveMaxRate = (p.getMaxRatePerMinute() != null && p.getMaxRatePerMinute().compareTo(BigDecimal.ZERO) > 0)
                ? p.getMaxRatePerMinute()
                : DEFAULT_MAX_RATE_PER_MINUTE;
        BigDecimal effectiveCoeff = (p.getEbookRateCoefficient() != null && p.getEbookRateCoefficient().compareTo(BigDecimal.ZERO) > 0)
                ? p.getEbookRateCoefficient()
                : DEFAULT_EBOOK_COEFFICIENT;
        BigDecimal effectiveAudioRate = p.getRatePerMinute() != null ? p.getRatePerMinute() : BigDecimal.ZERO;
        BigDecimal effectiveEbookRate = (p.getEbookRatePerMinute() != null && p.getEbookRatePerMinute().compareTo(BigDecimal.ZERO) > 0)
                ? p.getEbookRatePerMinute()
                : effectiveAudioRate.multiply(effectiveCoeff).setScale(4, RoundingMode.HALF_UP);

        long totalPlatformLiveMinutes = 0L;
        long totalPlatformLiveReadingMinutes = 0L;
        List<AuthorEarningSummaryDto> summaryList = new ArrayList<>();
        for (Author author : authorMap.values()) {
            long liveSec = authorLiveSecondsSum.getOrDefault(author.getId(), 0L);
            long liveMin = liveSec / 60;
            long liveReadSec = authorLiveReadingSecondsSum.getOrDefault(author.getId(), 0L);
            long liveReadMin = liveReadSec / 60;

            long mins = (!earnings.isEmpty() || "FINALIZED".equalsIgnoreCase(p.getStatus()))
                    ? authorMinutesSum.getOrDefault(author.getId(), 0L)
                    : (liveMin > 0 ? liveMin : authorMinutesSum.getOrDefault(author.getId(), 0L));
            long totalSec = mins * 60;

            long readMins = (!earnings.isEmpty() || "FINALIZED".equalsIgnoreCase(p.getStatus()))
                    ? authorReadingMinutesSum.getOrDefault(author.getId(), 0L)
                    : (liveReadMin > 0 ? liveReadMin : authorReadingMinutesSum.getOrDefault(author.getId(), 0L));
            long totalReadSec = readMins * 60;

            totalPlatformLiveMinutes += mins;
            totalPlatformLiveReadingMinutes += readMins;

            BigDecimal earned = authorEarnedSum.getOrDefault(author.getId(), BigDecimal.ZERO);
            if (!"FINALIZED".equalsIgnoreCase(p.getStatus()) && effectiveAudioRate.compareTo(BigDecimal.ZERO) > 0) {
                earned = effectiveAudioRate.multiply(BigDecimal.valueOf(mins))
                        .add(effectiveEbookRate.multiply(BigDecimal.valueOf(readMins)))
                        .setScale(2, RoundingMode.HALF_UP);
            }

            Set<String> effectiveBookIds = new HashSet<>();
            Set<String> listenedIds = authorPeriodListenedBookIds.getOrDefault(author.getId(), Collections.emptySet());
            effectiveBookIds.addAll(listenedIds);

            for (AuthorBook ab : authorBooksByAuthor.getOrDefault(author.getId(), Collections.emptyList())) {
                if (Boolean.TRUE.equals(ab.getIsActive())) {
                    Book b = allBooksMap.get(ab.getBookId());
                    if (b != null && !Boolean.TRUE.equals(b.getIsDeleted())) {
                        effectiveBookIds.add(b.getId());
                    }
                }
            }

            String matchName = author.getDisplayName() != null ? author.getDisplayName().toLowerCase().trim() : "";
            if (!matchName.isEmpty()) {
                for (Book b : allBooksMap.values()) {
                    if (!Boolean.TRUE.equals(b.getIsDeleted()) && b.getAuthor() != null
                            && b.getAuthor().toLowerCase().trim().equals(matchName)) {
                        effectiveBookIds.add(b.getId());
                    }
                }
            }

            summaryList.add(AuthorEarningSummaryDto.builder()
                    .authorId(author.getId())
                    .authorUserId(author.getUserId())
                    .authorName(author.getDisplayName())
                    .assignedBookIds(new ArrayList<>(effectiveBookIds))
                    .totalMinutes(mins)
                    .totalSeconds(totalSec)
                    .readingMinutes(readMins)
                    .readingSeconds(totalReadSec)
                    .totalEarned(earned)
                    .status("FINALIZED".equalsIgnoreCase(p.getStatus()) ? "paid" : "calculated")
                    .build());
        }

        long finalTotalMinutes = "FINALIZED".equalsIgnoreCase(p.getStatus())
                ? (p.getTotalMinutes() != null ? p.getTotalMinutes() : 0L)
                : (totalPlatformLiveMinutes > 0 ? totalPlatformLiveMinutes : (p.getTotalMinutes() != null ? p.getTotalMinutes() : 0L));

        long finalTotalReadingMinutes = "FINALIZED".equalsIgnoreCase(p.getStatus())
                ? (p.getTotalReadingMinutes() != null ? p.getTotalReadingMinutes() : 0L)
                : (totalPlatformLiveReadingMinutes > 0 ? totalPlatformLiveReadingMinutes : (p.getTotalReadingMinutes() != null ? p.getTotalReadingMinutes() : 0L));

        // 2. Build daily listening activity breakdown for the month
        ZoneId almatyZone = ZoneId.of("Asia/Almaty");
        OffsetDateTime monthStart = ym.atDay(1).atStartOfDay(almatyZone).toOffsetDateTime();
        OffsetDateTime monthEnd = ym.plusMonths(1).atDay(1).atStartOfDay(almatyZone).toOffsetDateTime();

        Map<LocalDate, Long> liveDailySec = new HashMap<>();
        List<Object[]> sessionsInMonth = audioSessionRepository.findSessionTimesBetween(monthStart, monthEnd);
        for (Object[] row : sessionsInMonth) {
            OffsetDateTime startedAt = (OffsetDateTime) row[0];
            Long sec = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            if (startedAt != null && sec > 0) {
                LocalDate d = startedAt.atZoneSameInstant(almatyZone).toLocalDate();
                liveDailySec.merge(d, sec, Long::sum);
            }
        }

        List<AudioDailyStats> monthlyStats = audioDailyStatsRepository.findByStatDateBetween(startDate, endDate);
        Map<LocalDate, Long> statsDailySec = new HashMap<>();
        for (AudioDailyStats s : monthlyStats) {
            if (s.getStatDate() != null) {
                statsDailySec.merge(s.getStatDate(), s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L, Long::sum);
            }
        }

        int daysInMonth = ym.lengthOfMonth();
        boolean hasLiveSessions = !sessionsInMonth.isEmpty();
        List<DailyActivityDto> dailyActivityList = new ArrayList<>(daysInMonth);
        for (int day = 1; day <= daysInMonth; day++) {
            LocalDate date = ym.atDay(day);
            long sec = hasLiveSessions ? liveDailySec.getOrDefault(date, 0L) : statsDailySec.getOrDefault(date, 0L);
            long min = sec / 60;
            String dayLabel = String.format("%02d.%02d", day, ym.getMonthValue());

            dailyActivityList.add(DailyActivityDto.builder()
                    .date(date)
                    .dayLabel(dayLabel)
                    .seconds(sec)
                    .minutes(min)
                    .build());
        }

        return RoyaltyPeriodResponseDto.builder()
                .id(p.getId())
                .month(p.getMonth())
                .monthLabel(getMonthLabel(p.getMonth()))
                .status(p.getStatus())
                .totalRevenue(p.getTotalRevenue())
                .adminExpense(p.getAdminExpense())
                .netPool(p.getNetPool())
                .companyShare(p.getCompanyShare())
                .royaltyPool(p.getRoyaltyPool())
                .totalMinutes(finalTotalMinutes)
                .totalReadingMinutes(finalTotalReadingMinutes)
                .ratePerMinute(effectiveAudioRate)
                .maxRatePerMinute(effectiveMaxRate)
                .ebookRateCoefficient(effectiveCoeff)
                .ebookRatePerMinute(effectiveEbookRate)
                .adminNote(p.getAdminNote())
                .calculatedAt(p.getCalculatedAt())
                .finalizedAt(p.getFinalizedAt())
                .createdAt(p.getCreatedAt())
                .earnings(earningDtos)
                .authorEarnings(summaryList)
                .dailyActivity(dailyActivityList)
                .build();
    }

    private List<RoyaltyEarningResponseDto> mapEarningsToDtos(List<RoyaltyEarning> earnings) {
        if (earnings.isEmpty()) return Collections.emptyList();

        Map<String, Author> authorMap = authorRepository.findAll().stream()
                .collect(Collectors.toMap(Author::getId, a -> a));
        Map<String, Book> bookMap = bookRepository.findAll().stream()
                .collect(Collectors.toMap(Book::getId, b -> b));

        return earnings.stream().map(e -> {
            Author author = authorMap.get(e.getAuthorId());
            Book book = e.getBookId() != null ? bookMap.get(e.getBookId()) : null;
            return RoyaltyEarningResponseDto.builder()
                    .id(e.getId())
                    .periodId(e.getPeriodId())
                    .authorId(e.getAuthorId())
                    .authorName(author != null ? author.getDisplayName() : e.getAuthorId())
                    .bookId(e.getBookId())
                    .bookTitle(book != null ? book.getTitle() : null)
                    .minutesListened(e.getMinutesListened())
                    .minutesRead(e.getMinutesRead() != null ? e.getMinutesRead() : 0L)
                    .amount(e.getAmount())
                    .status(e.getStatus())
                    .createdAt(e.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    private PayoutRequestResponseDto toPayoutDto(PayoutRequest p, Author author) {
        User user = null;
        if (author != null && author.getUserId() != null) {
            user = userRepository.findById(author.getUserId()).orElse(null);
        }

        return PayoutRequestResponseDto.builder()
                .id(p.getId())
                .authorId(p.getAuthorId())
                .authorName(author != null ? author.getDisplayName() : (user != null ? user.getName() : p.getAuthorId()))
                .authorEmail(user != null ? user.getEmail() : null)
                .authorPhone(author != null ? author.getPhone() : (user != null ? user.getPhone() : null))
                .amount(p.getAmount())
                .method(p.getMethod())
                .cardOrAccount(p.getCardOrAccount())
                .status(p.getStatus())
                .rejectionReason(p.getRejectionReason())
                .requestedAt(p.getRequestedAt())
                .processedAt(p.getProcessedAt())
                .build();
    }
}
