# ADR-004: Observability, Health Checks, and MDC Correlation IDs

## Status
Accepted

## Context
Бұған дейін жүйеде:
- Тек 5 класта ғана қарапайым логирование болды.
- Жүйенің күйін тексеретін Health endpoint болмады.
- Әр түрлі параллельді HTTP сұраныстардың логтары араласып кететін (Correlation ID жоқ).
- Құпиясөздер логқа түсіп қалу қаупі болды.

## Decision
1. **Spring Boot Actuator** енгізілді:
   - `GET /actuator/health` және `GET /actuator/info` ашық.
   - Микро-мониторинг және деплой жүйелері (Docker, Render, Railway, Kubernetes) үшін Liveness/Readiness тексерулері жұмыс істейді.
2. **MDC Request Correlation ID**:
   - `JwtAuthFilter` әр сұранысқа `X-Request-ID` генерациялайды немесе клиенттен қабылдайды.
   - SLF4J `MDC.put("requestId", ...)` арқылы барлық логтарға ортақ ID жазылады.
   - Сұраныс аяқталғанда `MDC.clear()` арқылы тазаланады.
3. **Logback Structured Logging**:
   - `logback-spring.xml`: Dev ортасында түрлі-түсті консистенциялы консоль логы, Prod ортасында JSON пішіміндегі машиналық оқылатын лог.
4. **Құпияларды қорғау (Zero-Secret Logging)**:
   - Логтардан құпиясөздер толық алынып тасталды.
