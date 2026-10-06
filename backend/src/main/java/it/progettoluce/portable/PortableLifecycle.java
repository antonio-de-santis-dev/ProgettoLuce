package it.progettoluce.portable;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("portable")
@RequestMapping("/portable")
public class PortableLifecycle {
  private final ConfigurableApplicationContext context;
  private final String token;
  private final String instance;
  private final AtomicBoolean stopping = new AtomicBoolean();

  public PortableLifecycle(
      ConfigurableApplicationContext context,
      @Value("${luce.portable.token}") String token,
      @Value("${luce.portable.instance}") String instance) {
    if (token.length() < 32 || instance.isBlank()) {
      throw new IllegalArgumentException("Identita portabile mancante");
    }
    this.context = context;
    this.token = token;
    this.instance = instance;
  }

  @GetMapping("/status")
  public Map<String, String> status() {
    return Map.of("instance", instance);
  }

  @PostMapping("/shutdown")
  public ResponseEntity<Void> shutdown(
      @RequestHeader(value = "X-Luce-Token", defaultValue = "") String supplied) {
    if (!MessageDigest.isEqual(
        token.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8))) {
      return ResponseEntity.status(403).build();
    }
    if (stopping.compareAndSet(false, true)) {
      Thread closer =
          new Thread(
              () -> {
                try {
                  Thread.sleep(300);
                } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
                }
                context.close();
              },
              "portable-shutdown");
      closer.start();
    }
    return ResponseEntity.accepted().build();
  }
}
