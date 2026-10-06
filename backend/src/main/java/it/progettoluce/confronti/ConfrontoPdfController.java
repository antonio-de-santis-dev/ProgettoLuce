package it.progettoluce.confronti;

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

  @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
  public ResponseEntity<byte[]> scarica(@PathVariable Long id) throws IOException {
    byte[] pdf = renderer.genera(confronti.leggi(id));
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename("confronto-" + id + ".pdf").build().toString())
        .cacheControl(CacheControl.noStore())
        .body(pdf);
  }
}
