# JWT (JSON Web Token)

**Breadcrumb:** 3. Spring Ecosystem › Spring Security

> JWT là định dạng token compact, self-contained cho stateless authentication — payload JSON đã ký mà client đưa vào header Authorization.

## Các điểm chính

- ✦ Cấu trúc: <code>Header.Payload.Signature</code> (Base64URL-encoded, ngăn cách bằng dấu chấm).
- ✦ Header: thuật toán (<code>HS256</code>, <code>RS256</code>). Payload: claim (<code>sub</code>, <code>exp</code>, <code>roles</code>). Signature: chứng minh tính xác thực.
- ✦ **HS256**: symmetric — cùng secret để ký và xác minh. **RS256**: asymmetric — private key ký, public key xác minh.
- ✦ Stateless: server không lưu session; xác minh token mỗi request.
- ✦ Expiry: access token ngắn hạn (15 phút) + refresh token dài hạn (7 ngày).
- ✦ Không thể vô hiệu hóa token riêng lẻ đến khi hết hạn — dùng blocklist/Redis cho logout.

*JWT: JwtAuthenticationFilter (OncePerRequestFilter) + JwtTokenProvider (generate/validate HS256) + AuthController login endpoint*
```java
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

// ---- JWT Filter: validates token on every request ----
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider,
                                    UserDetailsService userDetailsService) {
        this.tokenProvider    = tokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);

        // Only process if token exists and SecurityContext has no authentication yet
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (tokenProvider.validateToken(token)) {
                String username = tokenProvider.getUsername(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                // Attach request details (IP, session) to the authentication object
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Store in SecurityContext — downstream controllers can call
                // SecurityContextHolder.getContext().getAuthentication() to get this
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
            // If validateToken() fails: token is expired/tampered → no auth set → 401 from SecurityConfig
        }
        filterChain.doFilter(request, response);
    }

    // Extract "Bearer <token>" from Authorization header
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
    }
}

// ---- JWT Token Provider: generate and validate tokens ----
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secret;                // 256-bit secret from env var / secrets manager

    @Value("${jwt.access-token-expiry-ms:900000}")   // 15 minutes default
    private long accessTokenExpiryMs;

    @Value("${jwt.refresh-token-expiry-ms:604800000}") // 7 days default
    private long refreshTokenExpiryMs;

    // Generate access token (short-lived — 15 min)
    public String generateAccessToken(UserDetails user) {
        return buildToken(user, accessTokenExpiryMs, "access");
    }

    // Generate refresh token (long-lived — 7 days)
    public String generateRefreshToken(UserDetails user) {
        return buildToken(user, refreshTokenExpiryMs, "refresh");
    }

    private String buildToken(UserDetails user, long expiryMs, String tokenType) {
        return Jwts.builder()
            .setSubject(user.getUsername())
            .claim("roles", user.getAuthorities().stream()
                .map(a -> a.getAuthority()).toList())
            .claim("type", tokenType)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiryMs))
            // HS256: symmetric — same secret signs and verifies (single-service setup)
            // For microservices: use RS256 — private key signs, public key verifies
            .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
            .compact();
        // Result: "eyJhbGci....eyJzdWIi....SflKxwRJSMeKKF2Q"
        //          HEADER    PAYLOAD  SIGNATURE (Base64URL-encoded)
    }

    public String getUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT expired: {}", e.getMessage());
        } catch (JwtException e) {
            log.warn("Invalid JWT: {}", e.getMessage());
        }
        return false;
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes()))
            .build()
            .parseClaimsJws(token)
            .getBody();
    }
}

// ---- AuthController: login endpoint that issues JWT ----
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationManager authManager;
    private final JwtTokenProvider      tokenProvider;
    private final UserDetailsService    userDetailsService;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody @Valid LoginRequest request) {
        // Throws BadCredentialsException if username/password don't match
        authManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        UserDetails user = userDetailsService.loadUserByUsername(request.email());
        return ResponseEntity.ok(new TokenResponse(
            tokenProvider.generateAccessToken(user),
            tokenProvider.generateRefreshToken(user)
        ));
    }
}

record LoginRequest(@NotBlank String email, @NotBlank String password) {}
record TokenResponse(String accessToken, String refreshToken) {}
```

### 💡 Lời khuyên thực tế

Lưu JWT secret trong env var hoặc AWS Secrets Manager, đừng bao giờ trong source code. Dùng RS256 trong microservice để service có thể xác minh token với public key mà không cần private key.

### ❓ Câu hỏi phỏng vấn

- **Q:** Ba phần của JWT là gì?
- **Q:** Sự khác biệt giữa ký HS256 và RS256 là gì?
- **Q:** Làm thế nào để xử lý JWT revocation/logout trong hệ thống stateless?
