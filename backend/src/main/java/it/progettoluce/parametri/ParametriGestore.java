package it.progettoluce.parametri;

import jakarta.persistence.*;

@Entity
@Table(name = "parametri_gestore")
public class ParametriGestore {
  @Id private Long id;
  @Version private Long versione;

  @Column(nullable = false, columnDefinition = "text")
  private String configurazione;

  protected ParametriGestore() {}

  public ParametriGestore(String configurazione) {
    id = 1L;
    this.configurazione = configurazione;
  }

  public Long getVersione() {
    return versione;
  }

  public String getConfigurazione() {
    return configurazione;
  }

  public void aggiorna(String configurazione) {
    this.configurazione = configurazione;
  }
}
