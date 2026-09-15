# ADR-002: Google Identity Services (GIS) Server-Side Token Verification

## Status
Accepted

## Context
Пайдаланушыларға 1-click арқылы Google аккаунтымен жүйеге кіру мүмкіндігі қажет.
Қауіпсіздік талабы:
- Фронтендтен келетін деректерге сенбеу.
- Токеннің криптографиялық түпнұсқалығын бэкендте Google серверлері арқылы тексеру.
- Ескі аккаунттармен автоматты түрде сәйкестендіру (Account linking).
- Неверификацияланған Google email-дер арқылы аккаунтты басып алудан қорғау (Account takeover defense).

## Decision
1. **Frontend**: `@react-oauth/google` компоненті Google-дан ID Token (`credential`) алады және оны `POST /api/auth/google` эндпоинтына жібереді.
2. **Backend**:
   - `GoogleTokenVerifier` компоненті ресми `google-api-client` (2.7.0) кітапханасын пайдаланып, Google жария кілттері арқылы токенге қол қойылуын, `audience` (Client ID) және `expirationTime` тексереді.
   - `email_verified == true` екендігі міндетті түрде тексеріледі.
   - Егер `googleId` бойынша қолданушы табылса — кіргізеді, аватар жаңартады.
   - Егер `email` бойынша бар қолданушы болса — `googleId` байлап, аккаунттарды біріктіреді (Account Linking).
   - Жаңа қолданушы болса — автоматты түрде `role = "client"` және `authProvider = "GOOGLE"` етіп тіркейді (Google арқылы админ болуға тыйым салынады).

## Consequences
### Positive
- Жоғары қауіпсіздік (Google ID Token бұрмаланбайды).
- Пайдаланушы үшін ыңғайлы 1-шерту авторизациясы.
- Сурет пен аватар автоматты синхрондалады.
