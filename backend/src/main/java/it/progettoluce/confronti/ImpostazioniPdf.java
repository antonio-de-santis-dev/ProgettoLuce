package it.progettoluce.confronti;

import jakarta.persistence.*;

@Entity
@Table(name = "impostazioni_pdf")
public class ImpostazioniPdf {
  @Id private Long id;
  @Version private Long versione;

  @Column(nullable = false, columnDefinition = "text")
  private String configurazione;

  protected ImpostazioniPdf() {}

  public Long getVersione() {
    return versione;
  }

  public String getConfigurazione() {
    return configurazione;
  }

  public void aggiorna(String value) {
    configurazione = value;
  }
}
