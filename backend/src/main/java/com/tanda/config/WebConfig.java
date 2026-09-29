package com.tanda.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Public covers and receipts are statically served. Audio files are served through protected MediaController
        registry.addResourceHandler("/uploads/covers/**")
                .addResourceLocations("file:./uploads/covers/", "file:uploads/covers/")
                .setCachePeriod(3600);

        registry.addResourceHandler("/uploads/receipts/**")
                .addResourceLocations("file:./uploads/receipts/", "file:uploads/receipts/")
                .setCachePeriod(3600);
    }
}
