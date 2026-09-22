package com.tanda.service;

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
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.Book;
import com.tanda.entity.PayoutRequest;
import com.tanda.entity.PayoutTransaction;
import com.tanda.entity.RoyaltyEarning;
import com.tanda.entity.RoyaltyPeriod;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ConflictException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioDailyStatsRepository;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.PayoutRequestRepository;
import com.tanda.repository.PayoutTransactionRepository;
import com.tanda.repository.RoyaltyEarningRepository;
import com.tanda.repository.RoyaltyPeriodRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
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

    private final RoyaltyPeriodRepository royaltyPeriodRepository;
    private final RoyaltyEarningRepository royaltyEarningRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final PayoutTransactionRepository payoutTransactionRepository;
    private final AuthorRepository authorRepository;
    private final AuthorBookRepository authorBookRepository;
    private final BookRepository bookRepository;
    private final AudioDailyStatsRepository audioDailyStatsRepository;
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

    @Transactional(readOnly = true)
    public RoyaltyPeriodResponseDto getPeriod(String month) {
        RoyaltyPeriod period = royaltyPeriodRepository.findByMonth(month)
                .orElseThrow(() -> new ResourceNotFoundException("Роялти кезеңі табылмады: " + month));
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

        // 1. Audio statistics for this month
        List<AudioDailyStats> dailyStats = audioDailyStatsRepository.findByStatDateBetween(startDate, endDate);
        Map<String, Long> bookSecondsMap = new HashMap<>();
        for (AudioDailyStats s : dailyStats) {
            String bId = s.getBook().getId();
            bookSecondsMap.put(bId, bookSecondsMap.getOrDefault(bId, 0L) + s.getTotalSeconds());
        }

        // 2. Authors and book assignments
        List<Author> authors = authorRepository.findAll();
        List<AuthorBook> allAuthorBooks = authorBookRepository.findAll();
        Map<String, List<AuthorBook>> authorBooksMap = allAuthorBooks.stream()
                .collect(Collectors.groupingBy(AuthorBook::getAuthorId));

        Map<String, Book> allBooks = bookRepository.findAll().stream()
                .collect(Collectors.toMap(Book::getId, b -> b));

        // 3. Financial pools
        BigDecimal revenue = (request != null && request.getTotalRevenue() != null)
                ? request.getTotalRevenue().max(BigDecimal.ZERO)
                : (existingPeriod != null ? existingPeriod.getTotalRevenue() : BigDecimal.ZERO);
        BigDecimal expense = (request != null && request.getAdminExpense() != null)
                ? request.getAdminExpense().max(BigDecimal.ZERO)
                : (existingPeriod != null ? existingPeriod.getAdminExpense() : BigDecimal.ZERO);
        String note = (request != null && request.getAdminNote() != null)
                ? request.getAdminNote()
                : (existingPeriod != null ? existingPeriod.getAdminNote() : "");

        BigDecimal netPool = revenue.subtract(expense).max(BigDecimal.ZERO);
        BigDecimal companyShare = netPool.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal royaltyPool = netPool.subtract(companyShare);

        // 4. Calculate author listening minutes
        long totalPlatformMinutes = 0L;
        // Temporary holding structure: authorId -> list of {bookId, minutes}
        Map<String, Map<String, Long>> authorBookMinutesMap = new HashMap<>();

        for (Author author : authors) {
            String authorId = author.getId();
            List<AuthorBook> explicitAssignments = authorBooksMap.getOrDefault(authorId, Collections.emptyList());
            Set<String> assignedBookIds = explicitAssignments.stream()
                    .map(AuthorBook::getBookId)
                    .collect(Collectors.toSet());

            Map<String, BigDecimal> shareMap = explicitAssignments.stream()
                    .collect(Collectors.toMap(AuthorBook::getBookId, AuthorBook::getRoyaltyShare, (s1, s2) -> s1));

            // Also check name matching for books not explicitly in author_books
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
            for (String bookId : assignedBookIds) {
                long sec = bookSecondsMap.getOrDefault(bookId, 0L);
                long min = sec / 60;
                BigDecimal share = shareMap.getOrDefault(bookId, new BigDecimal("100.00"));
                long authorMin = (long) Math.floor(min * (share.doubleValue() / 100.0));
                authorBooksResult.put(bookId, authorMin);
                totalPlatformMinutes += authorMin;
            }
            authorBookMinutesMap.put(authorId, authorBooksResult);
        }

        BigDecimal ratePerMinute = totalPlatformMinutes > 0
                ? royaltyPool.divide(BigDecimal.valueOf(totalPlatformMinutes), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // 5. Persist or update RoyaltyPeriod
        RoyaltyPeriod period = existingPeriod != null ? existingPeriod : new RoyaltyPeriod();
        period.setId(month);
        period.setMonth(month);
        period.setStatus("CALCULATED");
        period.setTotalRevenue(revenue);
        period.setAdminExpense(expense);
        period.setNetPool(netPool);
        period.setCompanyShare(companyShare);
        period.setRoyaltyPool(royaltyPool);
        period.setTotalMinutes(totalPlatformMinutes);
        period.setRatePerMinute(ratePerMinute);
        period.setAdminNote(note);
        period.setCalculatedAt(OffsetDateTime.now());

        period = royaltyPeriodRepository.save(period);

        // 6. Persist earnings
        royaltyEarningRepository.deleteByPeriodId(period.getId());

        List<RoyaltyEarning> earningsToSave = new ArrayList<>();
        for (Author author : authors) {
            String authorId = author.getId();
            Map<String, Long> bookMins = authorBookMinutesMap.getOrDefault(authorId, Collections.emptyMap());
            for (Map.Entry<String, Long> entry : bookMins.entrySet()) {
                String bookId = entry.getKey();
                long minutes = entry.getValue();
                BigDecimal amount = ratePerMinute.multiply(BigDecimal.valueOf(minutes)).setScale(2, RoundingMode.HALF_UP);

                RoyaltyEarning earning = RoyaltyEarning.builder()
                        .id("earn-" + UUID.randomUUID().toString().substring(0, 12))
                        .periodId(period.getId())
                        .authorId(authorId)
                        .bookId(bookId)
                        .minutesListened(minutes)
                        .amount(amount)
                        .status("CALCULATED")
                        .build();
                earningsToSave.add(earning);
            }
        }
        royaltyEarningRepository.saveAll(earningsToSave);

        log.info("Royalty period {} calculated: revenue={}, pool={}, totalMinutes={}, ratePerMin={}",
                month, revenue, royaltyPool, totalPlatformMinutes, ratePerMinute);

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

        // 1. Author's books
        List<AuthorBook> assignments = authorBookRepository.findByAuthorId(author.getId());
        Set<String> authorBookIds = assignments.stream().map(AuthorBook::getBookId).collect(Collectors.toSet());

        String matchName = author.getDisplayName() != null ? author.getDisplayName().toLowerCase().trim() : "";
        List<Book> allBooks = bookRepository.findAll();
        List<Book> matchedBooks = allBooks.stream()
                .filter(b -> authorBookIds.contains(b.getId())
                        || (b.getAuthor() != null && b.getAuthor().toLowerCase().trim().equals(matchName)))
                .collect(Collectors.toList());

        List<String> matchedIds = matchedBooks.stream().map(Book::getId).collect(Collectors.toList());

        // 2. Audio stats for author's books
        List<AudioDailyStats> dailyStats = matchedIds.isEmpty()
                ? Collections.emptyList()
                : audioDailyStatsRepository.findByBookIdInAndStatDateBetween(matchedIds, startDate, endDate);

        Map<String, Long> dateSecondsMap = new HashMap<>();
        Map<String, Long> bookMinutesMap = new HashMap<>();
        OffsetDateTime latestListenedAt = null;

        for (AudioDailyStats s : dailyStats) {
            String dateStr = s.getStatDate().toString();
            long sec = s.getTotalSeconds() != null ? s.getTotalSeconds() : 0L;
            dateSecondsMap.put(dateStr, dateSecondsMap.getOrDefault(dateStr, 0L) + sec);

            String bId = s.getBook().getId();
            bookMinutesMap.put(bId, bookMinutesMap.getOrDefault(bId, 0L) + (sec / 60));

            if (s.getUpdatedAt() != null && (latestListenedAt == null || s.getUpdatedAt().isAfter(latestListenedAt))) {
                latestListenedAt = s.getUpdatedAt();
            }
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
        BigDecimal rate = period != null ? period.getRatePerMinute() : BigDecimal.ZERO;

        long authorMonthMinutes = monthTotalSec / 60;
        BigDecimal estimatedEarned = rate.multiply(BigDecimal.valueOf(authorMonthMinutes)).setScale(2, RoundingMode.HALF_UP);

        String periodStatus = "estimated";
        if (period != null) {
            periodStatus = "FINALIZED".equalsIgnoreCase(period.getStatus()) ? "paid" : "calculated";
        }

        // 5. Author Book Item DTOs
        List<AuthorBookItemDto> bookItems = matchedBooks.stream().map(b -> AuthorBookItemDto.builder()
                .id(b.getId())
                .title(b.getTitle())
                .author(b.getAuthor())
                .coverUrl(b.getCoverImage())
                .pages(b.getPages())
                .viewsCount(0L)
                .readsCount(0L)
                .totalMinutes(bookMinutesMap.getOrDefault(b.getId(), 0L))
                .savedCount(0L)
                .hasAudio(Boolean.TRUE.equals(b.getHasAudio()) || (b.getAudioUrl() != null && !b.getAudioUrl().isBlank()))
                .audioUrl(b.getAudioUrl())
                .build()
        ).collect(Collectors.toList());

        return AuthorStatsResponseDto.builder()
                .authorId(author.getId())
                .authorName(author.getDisplayName())
                .month(targetMonth)
                .authorBooks(bookItems)
                .totalMinutes(authorMonthMinutes)
                .totalSeconds(monthTotalSec)
                .estimatedEarned(estimatedEarned)
                .ratePerMinute(rate)
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
        List<RoyaltyEarning> earnings = royaltyEarningRepository.findByPeriodId(p.getId());
        List<RoyaltyEarningResponseDto> earningDtos = mapEarningsToDtos(earnings);

        // Summarize per author
        Map<String, Author> authorMap = authorRepository.findAll().stream()
                .collect(Collectors.toMap(Author::getId, a -> a));
        List<AuthorBook> allAuthorBooks = authorBookRepository.findAll();
        Map<String, List<String>> authorBookIdsMap = allAuthorBooks.stream()
                .collect(Collectors.groupingBy(
                        AuthorBook::getAuthorId,
                        Collectors.mapping(AuthorBook::getBookId, Collectors.toList())
                ));

        Map<String, Long> authorMinutesSum = new HashMap<>();
        Map<String, BigDecimal> authorEarnedSum = new HashMap<>();

        for (RoyaltyEarning e : earnings) {
            authorMinutesSum.put(e.getAuthorId(),
                    authorMinutesSum.getOrDefault(e.getAuthorId(), 0L) + e.getMinutesListened());
            authorEarnedSum.put(e.getAuthorId(),
                    authorEarnedSum.getOrDefault(e.getAuthorId(), BigDecimal.ZERO).add(e.getAmount()));
        }

        List<AuthorEarningSummaryDto> summaryList = new ArrayList<>();
        for (Author author : authorMap.values()) {
            long mins = authorMinutesSum.getOrDefault(author.getId(), 0L);
            BigDecimal earned = authorEarnedSum.getOrDefault(author.getId(), BigDecimal.ZERO);
            summaryList.add(AuthorEarningSummaryDto.builder()
                    .authorId(author.getId())
                    .authorName(author.getDisplayName())
                    .assignedBookIds(authorBookIdsMap.getOrDefault(author.getId(), Collections.emptyList()))
                    .totalMinutes(mins)
                    .totalEarned(earned)
                    .status("FINALIZED".equalsIgnoreCase(p.getStatus()) ? "paid" : "calculated")
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
                .totalMinutes(p.getTotalMinutes())
                .ratePerMinute(p.getRatePerMinute())
                .adminNote(p.getAdminNote())
                .calculatedAt(p.getCalculatedAt())
                .finalizedAt(p.getFinalizedAt())
                .createdAt(p.getCreatedAt())
                .earnings(earningDtos)
                .authorEarnings(summaryList)
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
