# ==========================================
# Stage 1: Build JAR with Eclipse Temurin JDK
# ==========================================
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /workspace

# Copy build files for dependency caching
COPY gradlew gradlew.bat build.gradle settings.gradle ./
COPY gradle ./gradle

# Make gradlew executable and fetch dependencies
RUN chmod +x ./gradlew && ./gradlew dependencies --no-daemon

# Copy source code and build production jar
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ==========================================
# Stage 2: Minimal Production Runtime
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create dedicated non-root user and group
RUN addgroup -S tanda && adduser -S tanda -G tanda

# Create media uploads storage directory with proper permissions
RUN mkdir -p /app/uploads/covers /app/uploads/audio /app/uploads/ebooks \
    && chown -R tanda:tanda /app

USER tanda:tanda

# Copy compiled jar from builder stage
COPY --from=builder --chown=tanda:tanda /workspace/build/libs/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8080

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
