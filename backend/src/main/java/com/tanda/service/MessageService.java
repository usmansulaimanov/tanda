package com.tanda.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.content.MessageRequestDto;
import com.tanda.dto.content.MessageResponseDto;
import com.tanda.entity.Message;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<MessageResponseDto> getMessagesForUser(String userId) {
        OffsetDateTime now = OffsetDateTime.now();
        return messageRepository.findMessagesForUser(userId).stream()
                .filter(m -> {
                    // Filter deleted by user
                    Set<String> deleted = parseIdSet(m.getDeletedByUserIds());
                    if (deleted.contains(userId)) return false;

                    // Filter expired
                    if (m.getExpiresAt() != null && m.getExpiresAt().isBefore(now)) {
                        return false;
                    }
                    return true;
                })
                .map(m -> toDto(m, userId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MessageResponseDto> getAllMessagesAdmin() {
        return messageRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(m -> toDto(m, null))
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(String userId, String messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message", "id", messageId));

        Set<String> readSet = parseIdSet(message.getReadByUserIds());
        readSet.add(userId);
        message.setReadByUserIds(String.join(",", readSet));

        if ("single".equalsIgnoreCase(message.getTargetType()) && userId.equals(message.getRecipientId())) {
            message.setReadAt(OffsetDateTime.now());
        }
        messageRepository.save(message);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        List<Message> userMsgs = messageRepository.findMessagesForUser(userId);
        for (Message m : userMsgs) {
            Set<String> readSet = parseIdSet(m.getReadByUserIds());
            if (!readSet.contains(userId)) {
                readSet.add(userId);
                m.setReadByUserIds(String.join(",", readSet));
                messageRepository.save(m);
            }
        }
    }

    @Transactional
    public void deleteForUser(String userId, String messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message", "id", messageId));

        if (Boolean.FALSE.equals(message.getCanReaderDelete())) {
            throw new IllegalArgumentException("Бұл хабарламаны өшіруге рұқсат етілмеген");
        }

        Set<String> deletedSet = parseIdSet(mClean(message.getDeletedByUserIds()));
        deletedSet.add(userId);
        message.setDeletedByUserIds(String.join(",", deletedSet));
        messageRepository.save(message);
        log.info("Message id='{}' hidden/deleted for user='{}'", messageId, userId);
    }

    @Transactional
    public MessageResponseDto sendMessage(String senderId, String senderName, String senderRole, MessageRequestDto dto) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expAt = null;
        if (dto.getExpiresInHours() != null && dto.getExpiresInHours() > 0) {
            expAt = now.plusHours(dto.getExpiresInHours());
        }

        String targetType = dto.getTargetType() != null ? dto.getTargetType().toLowerCase() : "all";
        String recipientId = null;
        String targetIdsStr = null;
        String targetNamesStr = null;

        if ("single".equalsIgnoreCase(targetType) && dto.getTargetUserIds() != null && !dto.getTargetUserIds().isEmpty()) {
            recipientId = dto.getTargetUserIds().get(0);
            targetIdsStr = recipientId;
        } else if (dto.getTargetUserIds() != null) {
            targetIdsStr = String.join(",", dto.getTargetUserIds());
        }

        if (dto.getTargetUserNames() != null) {
            targetNamesStr = String.join(",", dto.getTargetUserNames());
        }

        Message message = Message.builder()
                .id("msg-" + UUID.randomUUID().toString().substring(0, 8))
                .senderId(senderId)
                .senderName(senderName != null ? senderName : "Tanda")
                .senderRole(senderRole != null ? senderRole : "admin")
                .recipientId(recipientId)
                .targetType(targetType)
                .targetUserIds(targetIdsStr)
                .targetUserNames(targetNamesStr)
                .title(dto.getTitle().trim())
                .content(dto.getContent().trim())
                .priority(dto.getPriority() != null ? dto.getPriority().toLowerCase() : "normal")
                .bookId(dto.getBookId())
                .bookTitle(dto.getBookTitle())
                .newsId(dto.getNewsId())
                .newsTitle(dto.getNewsTitle())
                .canReaderDelete(dto.getCanReaderDelete() != null ? dto.getCanReaderDelete() : false)
                .expiresAt(expAt)
                .readByUserIds("")
                .deletedByUserIds("")
                .createdAt(now)
                .build();

        Message saved = messageRepository.save(message);
        log.info("Sent message: id='{}', title='{}', targetType='{}'", saved.getId(), saved.getTitle(), saved.getTargetType());
        return toDto(saved, senderId);
    }

    @Transactional
    public void deleteMessageAdmin(String messageId) {
        messageRepository.deleteById(messageId);
        log.info("Admin deleted message id='{}'", messageId);
    }

    @Transactional
    public void createWelcomeMessage(String recipientId, String recipientName) {
        try {
            Message welcome = Message.builder()
                    .id("msg-welcome-" + UUID.randomUUID().toString().substring(0, 8))
                    .senderName("Tanda")
                    .senderRole("admin")
                    .recipientId(recipientId)
                    .targetType("single")
                    .targetUserIds(recipientId)
                    .targetUserNames(recipientName)
                    .title("Tanda платформасына қош келдіңіз!")
                    .content("Құрметті " + (recipientName != null ? recipientName : "оқырман") + "! Біздің онлайн кітапханамызға қош келдіңіз. Мұнда қазақ және әлем әдебиетінің таңдаулы жауһарларын электронды түрде оқып, аудио нұсқасын тыңдай аласыз.")
                    .priority("news")
                    .canReaderDelete(true)
                    .createdAt(OffsetDateTime.now())
                    .readByUserIds("")
                    .deletedByUserIds("")
                    .build();
            messageRepository.save(welcome);
        } catch (Exception e) {
            log.warn("Could not create welcome message for user '{}': {}", recipientId, e.getMessage());
        }
    }

    @Transactional
    public void createBirthdayMessage(String recipientId, String recipientName) {
        try {
            Message bday = Message.builder()
                    .id("msg-bday-" + UUID.randomUUID().toString().substring(0, 8))
                    .senderName("Tanda")
                    .senderRole("admin")
                    .recipientId(recipientId)
                    .targetType("single")
                    .targetUserIds(recipientId)
                    .targetUserNames(recipientName)
                    .title("Туған күніңізбен!")
                    .content("Құрметті " + (recipientName != null ? recipientName : "оқырман") + "! Сізді туған күніңізбен шын жүректен құттықтаймыз! Сізге Tanda платформасында 30 күн тегін Премиум жазылым сыйға берілді.")
                    .priority("important")
                    .canReaderDelete(true)
                    .createdAt(OffsetDateTime.now())
                    .readByUserIds("")
                    .deletedByUserIds("")
                    .build();
            messageRepository.save(bday);
        } catch (Exception e) {
            log.warn("Could not create birthday message for user '{}': {}", recipientId, e.getMessage());
        }
    }

    private String mClean(String s) {
        return s != null ? s : "";
    }

    private Set<String> parseIdSet(String raw) {
        if (raw == null || raw.isBlank()) return new HashSet<>();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    private MessageResponseDto toDto(Message m, String currentUserId) {
        Set<String> readSet = parseIdSet(m.getReadByUserIds());
        Set<String> deletedSet = parseIdSet(m.getDeletedByUserIds());
        List<String> targetIds = m.getTargetUserIds() != null ? Arrays.asList(m.getTargetUserIds().split(",")) : new ArrayList<>();
        List<String> targetNames = m.getTargetUserNames() != null ? Arrays.asList(m.getTargetUserNames().split(",")) : new ArrayList<>();

        boolean isRead = currentUserId != null && readSet.contains(currentUserId);

        return MessageResponseDto.builder()
                .id(m.getId())
                .senderId(m.getSenderId())
                .senderName(m.getSenderName())
                .senderRole(m.getSenderRole())
                .recipientId(m.getRecipientId())
                .targetType(m.getTargetType())
                .targetUserIds(targetIds)
                .targetUserNames(targetNames)
                .title(m.getTitle())
                .content(m.getContent())
                .priority(m.getPriority())
                .bookId(m.getBookId())
                .bookTitle(m.getBookTitle())
                .newsId(m.getNewsId())
                .newsTitle(m.getNewsTitle())
                .canReaderDelete(m.getCanReaderDelete())
                .expiresAt(m.getExpiresAt())
                .createdAt(m.getCreatedAt())
                .isRead(isRead)
                .readByUserIds(new ArrayList<>(readSet))
                .deletedByUserIds(new ArrayList<>(deletedSet))
                .build();
    }

    @Transactional
    public void createQuoteBroadcast(com.tanda.entity.Quote quote) {
        String authorName = (quote.getAuthor() != null && !quote.getAuthor().isBlank()) ? quote.getAuthor().trim() : "Халық даналығы";
        String title = "Күнделікті үзінді: " + authorName;
        Message message = Message.builder()
                .id("msg-quote-" + UUID.randomUUID().toString().substring(0, 8))
                .senderName("Tanda • Цитата")
                .senderRole("admin")
                .targetType("all")
                .title(title)
                .content(quote.getText())
                .bookId(quote.getBookId())
                .bookTitle(quote.getBookTitle())
                .priority("normal")
                .canReaderDelete(true)
                .createdAt(OffsetDateTime.now())
                .build();
        messageRepository.save(message);
        log.info("Created quote broadcast message: id='{}', quoteId='{}'", message.getId(), quote.getId());
    }
}
