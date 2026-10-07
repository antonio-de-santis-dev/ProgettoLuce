package it.progettoluce.portable;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@Profile("portable")
public class PortableWeb {
  @GetMapping({"/tariffe", "/bollette", "/offerte", "/parametri", "/fonti", "/impostazioni-pdf", "/storico"})
  public String pagina() {
    return "forward:/index.html";
  }
}
