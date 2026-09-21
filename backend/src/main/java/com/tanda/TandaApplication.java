package com.tanda;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class TandaApplication {

    public static void main(String[] args) {
        SpringApplication.run(TandaApplication.class, args);
    }
}
