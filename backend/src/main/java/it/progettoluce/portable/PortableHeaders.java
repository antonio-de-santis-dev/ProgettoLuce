package it.progettoluce.portable;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Profile("portable")
public class PortableHeaders extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; "
            + "style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; "
            + "font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");
    String path = request.getRequestURI();
    response.setHeader(
        "Cache-Control",
        path.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : path.startsWith("/api/") || path.startsWith("/portable/") ? "no-store" : "no-cache");
    chain.doFilter(request, response);
  }
}
