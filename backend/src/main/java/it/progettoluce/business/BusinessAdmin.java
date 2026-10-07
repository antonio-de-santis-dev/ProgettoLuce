package it.progettoluce.business;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class BusinessAdmin {
  private final String token;

  public BusinessAdmin(@Value("${business.admin-token:}") String token) {
    this.token = token;
  }

  public void verifica(String supplied) {
    if (token.isBlank())
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "Configura BUSINESS_ADMIN_TOKEN per amministrare le tariffe.");
    if (!MessageDigest.isEqual(
        token.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8)))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chiave amministratore non valida.");
  }
}
