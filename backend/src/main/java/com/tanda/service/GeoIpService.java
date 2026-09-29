package com.tanda.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class GeoIpService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public GeoIpService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(1500))
                .build();
    }

    public String resolveLocation(String ip) {
        if (ip == null || ip.isBlank()) {
            return "Белгісіз орын";
        }

        String trimmedIp = ip.trim();

        // 1. Check local / private IPs
        if ("127.0.0.1".equals(trimmedIp) || "0:0:0:0:0:0:0:1".equals(trimmedIp) || "::1".equals(trimmedIp) || "localhost".equalsIgnoreCase(trimmedIp)) {
            return "Жергілікті желі (Localhost)";
        }
        if (trimmedIp.startsWith("192.168.") || trimmedIp.startsWith("10.") || trimmedIp.startsWith("172.16.") || trimmedIp.startsWith("172.31.")) {
            return "Ішкі желі (LAN)";
        }

        // 2. Check cache
        if (cache.containsKey(trimmedIp)) {
            return cache.get(trimmedIp);
        }

        // 3. Resolve via GeoIP API (ip-api.com)
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://ip-api.com/json/" + trimmedIp + "?fields=status,country,city"))
                    .timeout(Duration.ofMillis(1500))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 && response.body() != null) {
                JsonNode json = objectMapper.readTree(response.body());
                if ("success".equalsIgnoreCase(json.path("status").asText())) {
                    String city = json.path("city").asText("");
                    String country = json.path("country").asText("");

                    String localizedLocation = formatLocation(city, country);
                    cache.put(trimmedIp, localizedLocation);
                    return localizedLocation;
                }
            }
        } catch (Exception e) {
            log.debug("Could not resolve GeoIP for IP {}: {}", trimmedIp, e.getMessage());
        }

        // 4. Default fallback
        String fallback = "Қазақстан";
        cache.put(trimmedIp, fallback);
        return fallback;
    }

    private String formatLocation(String city, String country) {
        if (city.isBlank() && country.isBlank()) {
            return "Қазақстан";
        }
        String localizedCountry = localizeCountry(country);
        if (city.isBlank()) {
            return localizedCountry;
        }
        String localizedCity = localizeCity(city);
        return localizedCity + ", " + localizedCountry;
    }

    private String localizeCountry(String country) {
        if (country == null) return "Қазақстан";
        String lower = country.toLowerCase();
        if (lower.contains("kazakhstan") || lower.contains("казахстан") || lower.contains("қазақстан")) {
            return "Қазақстан";
        }
        if (lower.contains("russia") || lower.contains("россия")) {
            return "Ресей";
        }
        if (lower.contains("uzbekistan") || lower.contains("узбекистан")) {
            return "Өзбекстан";
        }
        if (lower.contains("kyrgyzstan") || lower.contains("кыргызстан")) {
            return "Қырғызстан";
        }
        if (lower.contains("turkey") || lower.contains("турция")) {
            return "Түркия";
        }
        if (lower.contains("united states") || lower.contains("usa")) {
            return "АҚШ";
        }
        return country;
    }

    private String localizeCity(String city) {
        if (city == null) return "";
        return switch (city.toLowerCase()) {
            case "almaty" -> "Алматы";
            case "astana", "nur-sultan" -> "Астана";
            case "shymkent" -> "Шымкент";
            case "karaganda", "qaraghandy" -> "Қарағанды";
            case "aktobe" -> "Ақтөбе";
            case "taraz" -> "Тараз";
            case "pavlodar" -> "Павлодар";
            case "ust-kamenogorsk", "oskemen" -> "Өскемен";
            case "semey" -> "Семей";
            case "kostanay", "qostanay" -> "Қостанай";
            case "kyzylorda", "qyzylorda" -> "Қызылорда";
            case "oral", "uralsk" -> "Орал";
            case "petropavl", "petropavlovsk" -> "Петропавл";
            case "aktau" -> "Ақтау";
            case "attyrau", "atyrau" -> "Атырау";
            case "temirtau" -> "Теміртау";
            case "turkistan", "turkestan" -> "Түркістан";
            case "kokshetau" -> "Көкшетау";
            default -> city;
        };
    }
}
