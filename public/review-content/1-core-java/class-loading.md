# Class Loading

**Breadcrumb:** 1. Core Java › JVM Internals

> Hệ thống ClassLoader tải, liên kết (verify/prepare/resolve) và khởi tạo bytecode class khi lần đầu sử dụng, theo mô hình parent-delegation để đảm bảo bảo mật và nhất quán.

## Các điểm chính

- ✦ **Bootstrap ClassLoader**: tải các class JDK core (<code>java.lang.*</code>) từ chính JDK.
- ✦ **Platform/Extension ClassLoader**: tải các module extension JDK.
- ✦ **Application ClassLoader**: tải các class ứng dụng từ classpath.
- ✦ Parent delegation: con hỏi cha trước; chỉ tự tải nếu cha không tìm thấy — ngăn thay thế độc hại các class core.
- ✦ Class được tải lazily khi lần đầu sử dụng, không phải lúc khởi động.
- ✦ <code>Class.forName("com.example.Foo")</code> tải class một cách tường minh.

*Custom ClassLoader: parent delegation + hot-reload DiscountEngine + leak warning*
```java
import java.nio.file.*;
import java.io.IOException;

// ---- Parent Delegation Model ----
// When loading "com.example.Order":
//   ApplicationClassLoader → asks Platform (Extension) CL → asks Bootstrap CL
//   Bootstrap: "not my class" → Platform: "not mine" → Application: loads from classpath
// This prevents app code from replacing java.lang.String etc.

// ---- Custom ClassLoader: hot-reload discount rules at runtime ----
// Use case: business team updates DiscountStrategy .class files without restarting the app
public class RuleHotReloadClassLoader extends ClassLoader {
    private final Path ruleDir;

    public RuleHotReloadClassLoader(Path ruleDir, ClassLoader parent) {
        super(parent);   // always pass parent — preserves delegation chain
        this.ruleDir = ruleDir;
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        // Only intercept rule classes; delegate everything else to parent
        if (!name.startsWith("com.example.rules.")) {
            return super.findClass(name);
        }

        Path classFile = ruleDir.resolve(name.replace('.', '/') + ".class");
        if (!Files.exists(classFile)) {
            throw new ClassNotFoundException("Rule class not found: " + name);
        }
        try {
            byte[] bytes = Files.readAllBytes(classFile);
            return defineClass(name, bytes, 0, bytes.length);
        } catch (IOException e) {
            throw new ClassNotFoundException("Failed to load rule: " + name, e);
        }
    }
}

// ---- Using the hot-reload loader ----
public class DiscountEngine {
    private volatile RuleHotReloadClassLoader ruleLoader;

    public DiscountEngine(Path rulesDir) {
        this.ruleLoader = new RuleHotReloadClassLoader(rulesDir, getClass().getClassLoader());
    }

    // Called when rule .class files change on disk
    public synchronized void reloadRules(Path rulesDir) {
        // Old loader (and the classes it defined) become eligible for GC
        this.ruleLoader = new RuleHotReloadClassLoader(rulesDir, getClass().getClassLoader());
    }

    public BigDecimal applyDiscount(Order order) throws Exception {
        Class<?> ruleClass = ruleLoader.loadClass("com.example.rules.SeasonalDiscount");
        DiscountRule rule = (DiscountRule) ruleClass.getDeclaredConstructor().newInstance();
        return rule.apply(order);
    }
}

// ---- ClassLoader leak warning ----
// If 'ruleLoader' is referenced by a long-lived object (static field, thread local)
// after reload, the old ClassLoader and ALL classes it loaded stay in Metaspace → OOM
// Fix: make the ClassLoader reference replaceable (volatile field, or WeakReference)
```

### 💡 Lời khuyên thực tế

Spring DevTools dùng custom class loader để hot-reload. ClassLoader leak (giữ tham chiếu đến class sau khi undeploy) gây Metaspace OOM trong application server. Luôn dùng `Thread.currentThread().getContextClassLoader()` trong code framework.

### ❓ Câu hỏi phỏng vấn

- **Q:** Giải thích mô hình parent delegation của ClassLoading.
- **Q:** ClassLoader leak là gì và nó gây Metaspace OOM thế nào?
- **Q:** Bạn implement hot-reload class trong Java như thế nào?
