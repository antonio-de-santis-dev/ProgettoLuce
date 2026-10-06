package it.progettoluce.confronti;

import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/confronti")
public class ConfrontoPdfController {
  private final ConfrontoService confronti;
  private final ConfrontoPdfRenderer renderer;

  public ConfrontoPdfController(ConfrontoService confronti, ConfrontoPdfRenderer renderer) {
    this.confronti = confronti;
    this.renderer = renderer;
  }

  @PostMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
  public ResponseEntity<byte[]> personalizza(
      @PathVariable Long id, @Valid @RequestBody PdfPersonalizzazione opzioni) throws IOException {
    return risposta(id, renderer.genera(confronti.leggi(id), opzioni));
  }

  @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
  public ResponseEntity<byte[]> scarica(@PathVariable Long id) throws IOException {
    byte[] pdf = renderer.genera(confronti.leggi(id));
    return risposta(id, pdf);
  }

  private ResponseEntity<byte[]> risposta(Long id, byte[] pdf) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename("confronto-" + id + ".pdf").build().toString())
        .cacheControl(CacheControl.noStore())
        .body(pdf);
  }
}
