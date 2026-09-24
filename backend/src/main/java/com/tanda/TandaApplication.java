package com.tanda;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@EnableScheduling
@SpringBootApplication
public class TandaApplication {

    public static final String TIMEZONE_KZ = "Asia/Almaty";

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone(TIMEZONE_KZ));
    }

    public static void main(String[] args) {
        SpringApplication.run(TandaApplication.class, args);
    }
}

