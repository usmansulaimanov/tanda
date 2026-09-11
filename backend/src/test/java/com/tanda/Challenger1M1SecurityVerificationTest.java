package com.tanda;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.controller.UserController;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.entity.User;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import com.tanda.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class Challenger1M1SecurityVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserController userController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String clientToken;
    private String adminToken;
    private User testClientUser;
    private User testAdminUser;

    @BeforeEach
    void setUp() {
        // Ensure a test client user exists
        testClientUser = userRepository.findByEmail("client_challenger1@tanda.kz").orElseGet(() -> {
            User u = User.builder()
                    .id("user-c1-" + UUID.randomUUID().toString().substring(0, 8))
                    .idNumber("777 001")
                    .name("Client Challenger")
                    .email("client_challenger1@tanda.kz")
                    .passwordHash("$2a$10$abcdefghijklmnopqrstuvwxyz1234567890")
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(u);
        });

        // Ensure default admin user is loaded
        testAdminUser = userRepository.findByEmail("admin@tanda.kz").orElseThrow();

        // Generate real tokens via JwtTokenProvider
        clientToken = jwtTokenProvider.generateToken(testClientUser);
        adminToken = jwtTokenProvider.generateToken(testAdminUser);
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // =========================================================================
    // TASK 1: Verify authenticated client user (ROLE_CLIENT) attempting to access
    // /api/v1/admin/users (and related admin routes) is blocked with HTTP 403 Forbidden.
    // =========================================================================
    @Nested
    @DisplayName("Task 1: ROLE_CLIENT blocked on /api/v1/admin/** with HTTP 403 Forbidden")
    class RoleClientAccessControlTests {

        @Test
        @DisplayName("1.1 GET /api/v1/admin/users with ROLE_CLIENT Bearer token returns 403 Forbidden")
        void testGetV1AdminUsersAsClientReturns403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("1.2 GET /api/admin/users (unversioned) with ROLE_CLIENT Bearer token returns 403 Forbidden")
        void testGetUnversionedAdminUsersAsClientReturns403() throws Exception {
            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("1.3 GET /api/v1/admin/users/{id} with ROLE_CLIENT returns 403 Forbidden")
        void testGetV1AdminUserByIdAsClientReturns403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users/" + testAdminUser.getId())
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("1.4 PATCH /api/v1/admin/users/{id} with ROLE_CLIENT returns 403 Forbidden")
        void testPatchV1AdminUserAsClientReturns403() throws Exception {
            UpdateUserRequestDto updateDto = new UpdateUserRequestDto();
            updateDto.setName("Hacked Name");

            mockMvc.perform(patch("/api/v1/admin/users/" + testClientUser.getId())
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateDto)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("1.5 DELETE /api/v1/admin/users/{id} with ROLE_CLIENT returns 403 Forbidden")
        void testDeleteV1AdminUserAsClientReturns403() throws Exception {
            mockMvc.perform(delete("/api/v1/admin/users/" + testClientUser.getId())
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("1.6 Contrast: Unauthenticated request to /api/v1/admin/users returns 401 Unauthorized")
        void testUnauthenticatedV1AdminUsersReturns401() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("1.7 Contrast: Authenticated ADMIN user to /api/v1/admin/users returns 200 OK")
        void testAdminAccessToV1AdminUsersReturns200() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("1.8 Contrast: Authenticated ADMIN user to unversioned /api/admin/users returns 200 OK")
        void testAdminAccessToUnversionedAdminUsersReturns200() throws Exception {
            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("1.9 POST /api/v1/books with ROLE_CLIENT returns 403 Forbidden")
        void testCreateBookAsClientReturns403() throws Exception {
            mockMvc.perform(post("/api/v1/books")
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());
        }
    }

    // =========================================================================
    // TASK 2: Verify unauthenticated requests to /api/v1/auth/login and
    // /api/v1/auth/register are properly allowed by security filter (permitAll).
    // =========================================================================
    @Nested
    @DisplayName("Task 2: Unauthenticated /api/v1/auth/login and /register permitAll parity")
    class UnauthenticatedAuthEndpointsTests {

        @Test
        @DisplayName("2.1 POST /api/v1/auth/login with empty JSON body returns 400 Bad Request (NOT 401)")
        void testV1LoginEmptyBodyReturns400() throws Exception {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("2.2 POST /api/auth/login (unversioned) with empty JSON body returns 400 Bad Request (NOT 401)")
        void testUnversionedLoginEmptyBodyReturns400() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("2.3 POST /api/v1/auth/login with invalid email format returns 400 Bad Request")
        void testV1LoginInvalidEmailReturns400() throws Exception {
            LoginRequestDto dto = LoginRequestDto.builder()
                    .email("not-an-email")
                    .password("somepassword")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("2.4 POST /api/v1/auth/login with non-existent user returns 401 Unauthorized (from AuthService, not filter)")
        void testV1LoginNonExistentUserReturns401FromService() throws Exception {
            LoginRequestDto dto = LoginRequestDto.builder()
                    .email("nonexistent_challenger@tanda.kz")
                    .password("wrongpassword123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("2.5 POST /api/v1/auth/register with empty JSON body returns 400 Bad Request (NOT 401)")
        void testV1RegisterEmptyBodyReturns400() throws Exception {
            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("2.6 POST /api/auth/register (unversioned) with empty JSON body returns 400 Bad Request (NOT 401)")
        void testUnversionedRegisterEmptyBodyReturns400() throws Exception {
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("2.7 POST /api/v1/auth/register with valid payload creates user and returns 201 Created")
        void testV1RegisterSuccessReturns201() throws Exception {
            String email = "reg_test_" + UUID.randomUUID().toString().substring(0, 8) + "@tanda.kz";
            RegisterRequestDto dto = RegisterRequestDto.builder()
                    .name("Жаңа Қолданушы")
                    .email(email)
                    .password("securePass123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.token", notNullValue()))
                    .andExpect(jsonPath("$.user.email", is(email)))
                    .andExpect(jsonPath("$.user.role", is("client")));
        }

        @Test
        @DisplayName("2.8 POST /api/v1/auth/logout without credentials returns 200 OK")
        void testV1LogoutUnauthenticatedReturns200() throws Exception {
            mockMvc.perform(post("/api/v1/auth/logout"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("2.9 Contrast: GET /api/v1/auth/me without token returns 401 Unauthorized (protected)")
        void testV1AuthMeUnauthenticatedReturns401() throws Exception {
            mockMvc.perform(get("/api/v1/auth/me"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // TASK 3: Test method security on UserController
    // Verify @EnableMethodSecurity and @PreAuthorize("hasRole('ADMIN')") trigger
    // at the method level when UserController methods are called directly or via mock user.
    // =========================================================================
    @Nested
    @DisplayName("Task 3: Method Security on UserController")
    class MethodSecurityTests {

        @Test
        @DisplayName("3.1 Direct call to UserController.getAllUsers() with unauthenticated context throws AuthenticationCredentialsNotFoundException")
        void testDirectGetAllUsersUnauthenticatedThrowsAccessDenied() {
            SecurityContextHolder.clearContext();

            assertThatThrownBy(() -> userController.getAllUsers(null, null))
                    .isInstanceOf(org.springframework.security.authentication.AuthenticationCredentialsNotFoundException.class);
        }

        @Test
        @DisplayName("3.2 Direct call to UserController.getAllUsers() with ROLE_CLIENT throws AccessDeniedException")
        void testDirectGetAllUsersRoleClientThrowsAccessDenied() {
            UserPrincipal principal = UserPrincipal.create(testClientUser);
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            assertThatThrownBy(() -> userController.getAllUsers(null, null))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("3.3 Direct call to UserController.getUserById() with ROLE_CLIENT throws AccessDeniedException")
        void testDirectGetUserByIdRoleClientThrowsAccessDenied() {
            UserPrincipal principal = UserPrincipal.create(testClientUser);
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            assertThatThrownBy(() -> userController.getUserById(testAdminUser.getId()))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("3.4 Direct call to UserController.updateUser() with ROLE_CLIENT throws AccessDeniedException")
        void testDirectUpdateUserRoleClientThrowsAccessDenied() {
            UserPrincipal principal = UserPrincipal.create(testClientUser);
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            UpdateUserRequestDto dto = new UpdateUserRequestDto();
            dto.setName("Unauthorized Edit");

            assertThatThrownBy(() -> userController.updateUser(testClientUser.getId(), dto))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("3.5 Direct call to UserController.deleteUser() with ROLE_CLIENT throws AccessDeniedException")
        void testDirectDeleteUserRoleClientThrowsAccessDenied() {
            UserPrincipal principal = UserPrincipal.create(testClientUser);
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            assertThatThrownBy(() -> userController.deleteUser(testClientUser.getId()))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("3.6 Direct call to UserController.getAllUsers() with ROLE_ADMIN succeeds")
        void testDirectGetAllUsersRoleAdminSucceeds() {
            UserPrincipal principal = UserPrincipal.create(testAdminUser);
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            var response = userController.getAllUsers(null, null);
            assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody()).isNotEmpty();
        }

        @Test
        @WithMockUser(roles = "CLIENT")
        @DisplayName("3.7 Spring Security @WithMockUser(roles='CLIENT') on UserController.getUserById throws AccessDeniedException")
        void testWithMockUserClientThrowsAccessDenied() {
            assertThatThrownBy(() -> userController.getUserById(testAdminUser.getId()))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("3.8 Spring Security @WithMockUser(roles='ADMIN') on UserController.getUserById succeeds")
        void testWithMockUserAdminSucceeds() {
            var response = userController.getUserById(testAdminUser.getId());
            assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getEmail()).isEqualTo("admin@tanda.kz");
        }
    }

    // =========================================================================
    // TASK 4: Adversarial Edge Cases (CORS, Token Tampering, Role Spoofing)
    // =========================================================================
    @Nested
    @DisplayName("Task 4: Adversarial Edge Cases & Boundaries")
    class AdversarialEdgeCasesTests {

        @Test
        @DisplayName("4.1 Malformed/Tampered Bearer token to /api/v1/admin/users returns 401 Unauthorized")
        void testTamperedTokenReturns401() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Bearer " + clientToken + "tampered"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("4.2 Non-existent Bearer prefix (Basic auth) to /api/v1/admin/users returns 401 Unauthorized")
        void testBasicAuthReturns401() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Basic YWRtaW46cGFzc3dvcmQ="))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("4.3 User with arbitrary non-admin role (e.g. ROLE_MODERATOR) returns 403 Forbidden")
        void testArbitraryRoleReturns403() {
            SimpleGrantedAuthority auth = new SimpleGrantedAuthority("ROLE_MODERATOR");
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    "mod@tanda.kz", null, List.of(auth)
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);

            assertThatThrownBy(() -> userController.getAllUsers(null, null))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("4.4 CORS preflight OPTIONS request from trusted origin http://localhost:5173 is allowed")
        void testCorsTrustedOriginAllowed() throws Exception {
            mockMvc.perform(options("/api/v1/admin/users")
                            .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                    .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
        }

        @Test
        @DisplayName("4.5 CORS preflight OPTIONS request from untrusted origin http://evil.com does not receive allow header")
        void testCorsUntrustedOriginRejected() throws Exception {
            mockMvc.perform(options("/api/v1/admin/users")
                            .header(HttpHeaders.ORIGIN, "http://evil.com")
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                    .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
        }
    }
}
