# Deploy Service & systemd

**Breadcrumb:** 11. Linux & Deployment

> systemd là service manager tiêu chuẩn trên Linux hiện đại. Dùng systemd service unit cho ứng dụng Java: tự động restart khi fail, start khi boot, quản lý log qua journald, và điều khiển lifecycle gọn gàng.

## Các điểm chính

- ✦ <code>systemctl start/stop/restart/status &lt;service&gt;</code>: quản lý lifecycle service.
- ✦ <code>systemctl enable &lt;service&gt;</code>: start khi boot. <code>systemctl disable</code>: xóa khỏi boot.
- ✦ <code>journalctl -u myapp -f</code>: follow log của service cụ thể.
- ✦ <code>journalctl -u myapp --since "1 hour ago"</code>: query log theo thời gian.
- ✦ <code>scp user@host:file .</code>: copy file qua SSH. <code>rsync -avz src/ user@host:dst/</code>: sync incremental hiệu quả.
- ✦ Đặt <code>SuccessExitStatus=143</code> cho Spring Boot: thoát với 143 (128+SIGTERM) khi graceful shutdown.

*systemd service unit và quy trình deploy*
```java
# /etc/systemd/system/myapp.service
[Unit]
Description=My Spring Boot Application
After=network.target mysql.service

[Service]
User=appuser
Group=appgroup
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/java   -Xms1g -Xmx1g   -XX:+UseG1GC   -XX:+HeapDumpOnOutOfMemoryError   -XX:HeapDumpPath=/var/log/myapp   -XX:+ExitOnOutOfMemoryError   -Dspring.profiles.active=prod   -jar /opt/myapp/app.jar
SuccessExitStatus=143         # Spring Boot thoát 143 khi SIGTERM (graceful shutdown)
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target

# --- Đăng ký và start ---
sudo systemctl daemon-reload   # reload sau khi tạo/sửa unit file
sudo systemctl enable myapp    # start khi boot
sudo systemctl start myapp
sudo systemctl status myapp    # verify đang chạy

# --- Deploy JAR version mới ---
# Bước 1: upload JAR mới
scp target/app-2.0.jar appuser@server:/opt/myapp/app-new.jar

# Bước 2: trên server — backup + swap + restart
ssh appuser@server '
  cp /opt/myapp/app.jar /opt/myapp/app.jar.bak
  mv /opt/myapp/app-new.jar /opt/myapp/app.jar
  sudo systemctl restart myapp
'

# Bước 3: verify
ssh appuser@server 'sudo journalctl -u myapp -f -n 50'
# và: curl http://server:8080/actuator/health
```

### 💡 Lời khuyên thực tế

Luôn dùng systemd thay vì raw `nohup`: systemd tự restart khi fail, quản lý log qua journald (có rotation), start lại khi reboot. Đặt `SuccessExitStatus=143` — không có nó, systemd coi graceful shutdown của Spring Boot là crash và cố restart không cần thiết. Dùng `After=mysql.service` để đảm bảo DB khởi động xong trước khi app start.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Tạo systemd service cho Spring Boot app thế nào?</b></summary>

Tạo file `.service` trong thư mục `/etc/systemd/system/` định nghĩa các thẻ `[Service]` chứa đường dẫn `ExecStart=/usr/bin/java -jar /path/to/app.jar` và chạy lệnh `systemctl enable --now app.service`.
</details>

<details>
<summary><b>Q: systemctl stop khác kill -9 vào Java process thế nào?</b></summary>

`systemctl stop` gửi tín hiệu SIGTERM (kill -15) cho Java process để tắt graceful shutdown an toàn. `kill -9` tắt thô bạo cưỡng chế ngay lập tức, không giải phóng tài nguyên.
</details>

<details>
<summary><b>Q: Xem và filter log của systemd service cụ thể thế nào?</b></summary>

Sử dụng công cụ `journalctl`: chạy lệnh `journalctl -u app.service -f` để xem live log hoặc `journalctl -u app.service --since "1 hour ago"` để xem log 1 giờ qua.
</details>
