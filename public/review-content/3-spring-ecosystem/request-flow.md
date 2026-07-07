# Luồng Request Spring MVC

**Breadcrumb:** 3. Spring Ecosystem › Spring MVC

> Mỗi HTTP request vào DispatcherServlet, đi qua filter → handler mapping → handler adapter → controller → view resolution, với interceptor bọc handler execution.

## Các điểm chính

- ✦ 1. **Filter chain**: Spring Security, CORS, encoding filter — trước Spring MVC.
- ✦ 2. **DispatcherServlet** nhận request.
- ✦ 3. **HandlerMapping**: <code>RequestMappingHandlerMapping</code> tìm controller method khớp.
- ✦ 4. **HandlerInterceptor.preHandle()**: kiểm tra authentication, logging.
- ✦ 5. **HandlerAdapter** gọi controller method, giải quyết argument.
- ✦ 6. **Controller** thực thi business logic, trả về <code>ModelAndView</code> hoặc response body.
- ✦ 7. **HandlerInterceptor.postHandle()**: thêm header, chỉnh sửa model.
- ✦ 8. **View resolution** (cho MVC) hoặc <code>HttpMessageConverter</code> (cho REST) ghi response.
- ✦ 9. **HandlerInterceptor.afterCompletion()**: cleanup, logging.

*Request flow demo: RequestLoggingInterceptor (preHandle/postHandle/afterCompletion) + WebMvcConfigurer registration*
```java
import org.springframework.web.servlet.*;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.stereotype.*;
import org.slf4j.*;

// ---- Request Flow: Filter → DispatcherServlet → Interceptor → Controller → Response ----
//
// 1. FILTER (Servlet API, before Spring MVC)
//    → Security filter (Spring Security)
//    → CORS filter
//    → Correlation ID filter  ← runs here
//    → DispatcherServlet
// 2. HandlerMapping: maps URL to @RequestMapping method
// 3. preHandle() interceptor
// 4. Controller method executes
// 5. postHandle() interceptor (only on success)
// 6. afterCompletion() interceptor (always — even on exception)
// 7. HttpMessageConverter → JSON serialized → response sent

// ---- Interceptor: timing + request logging (runs INSIDE Spring context) ----
@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingInterceptor.class);
    // ThreadLocal: each request thread has its own start time
    private final ThreadLocal<Long> startTime = new ThreadLocal<>();

    // Step 3: called before controller — return false to abort (e.g. failed auth check)
    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        startTime.set(System.currentTimeMillis());

        // Access handler metadata — only possible with interceptors (not filters)
        if (handler instanceof HandlerMethod handlerMethod) {
            log.debug("→ [{}.{}] {} {}",
                handlerMethod.getBeanType().getSimpleName(),
                handlerMethod.getMethod().getName(),
                request.getMethod(),
                request.getRequestURI());
        }
        return true; // continue processing; return false to send 401/403 and stop chain
    }

    // Step 5: called after controller returns — model is available, response not yet written
    @Override
    public void postHandle(HttpServletRequest request,
                           HttpServletResponse response,
                           Object handler,
                           ModelAndView modelAndView) {
        // Rarely used for REST APIs (no ModelAndView); useful for MVC apps to inject view data
        response.addHeader("X-Served-By", "order-service");
    }

    // Step 6: called after response committed — always runs (even on exception)
    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {
        long elapsed = System.currentTimeMillis() - startTime.get();
        startTime.remove(); // CRITICAL: clean up ThreadLocal to prevent memory leak

        if (ex != null) {
            log.error("✗ {} {} → {} ({}ms) [exception: {}]",
                request.getMethod(), request.getRequestURI(),
                response.getStatus(), elapsed, ex.getMessage());
        } else {
            log.info("✓ {} {} → {} ({}ms)",
                request.getMethod(), request.getRequestURI(),
                response.getStatus(), elapsed);
        }
    }
}

// ---- Register interceptor via WebMvcConfigurer ----
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final RequestLoggingInterceptor loggingInterceptor;

    public WebMvcConfig(RequestLoggingInterceptor loggingInterceptor) {
        this.loggingInterceptor = loggingInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loggingInterceptor)
                .addPathPatterns("/api/**")          // apply to all API endpoints
                .excludePathPatterns(               // skip these (already handled by security)
                    "/api/v1/auth/**",
                    "/actuator/**"
                );
    }
}
```

### 💡 Lời khuyên thực tế

Dùng filter cho cross-cutting concern phải áp dụng bất kể Spring MVC (ví dụ: security). Dùng interceptor cho concern Spring-aware (ví dụ: truy cập metadata controller method). Cả hai đăng ký khác nhau — filter qua FilterRegistrationBean, interceptor qua WebMvcConfigurer.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa Filter và Interceptor trong Spring MVC là gì?
- **Q:** Spring Security hoạt động tại điểm nào trong luồng request?
- **Q:** DispatcherServlet tìm handler đúng cho request thế nào?
