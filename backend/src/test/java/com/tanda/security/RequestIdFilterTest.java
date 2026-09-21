package com.tanda.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RequestIdFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("RequestIdFilter generates X-Request-ID response header if omitted in request")
    void testGeneratesRequestIdHeader() throws Exception {
        mockMvc.perform(get("/api/v1/books"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Request-ID"));
    }

    @Test
    @DisplayName("RequestIdFilter preserves custom incoming X-Request-ID header in response")
    void testPreservesIncomingRequestIdHeader() throws Exception {
        String customId = "req-custom-trace-12345";
        mockMvc.perform(get("/api/v1/books")
                        .header("X-Request-ID", customId))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Request-ID", customId));
    }
}
