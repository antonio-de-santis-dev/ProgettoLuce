package it.progettoluce.confronti;

import it.progettoluce.bollette.*;
import it.progettoluce.calcolo.*;
import it.progettoluce.offerte.*;
import it.progettoluce.parametri.*;
import it.progettoluce.shared.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfrontoService {
  public record Richiesta(@NotNull @Positive Long bollettaId, @NotNull @Positive Long offertaId) {}

  public record Snapshot(
      String versioneMotore,
      Long bollettaId,
      BollettaRequest bolletta,
      OffertaResponse offerta,
      ParametriRequest parametri,
      RisultatoCalcolo risultato) {}

  public record Risposta(Long id, Instant creatoIl, Snapshot dati) {}

  private final BollettaService bollette;
  private final OffertaService offerte;
  private final ParametriService parametri;
  private final MotoreCalcolo motore;
  private final ConfrontoRepository repository;
  private final JsonCodec codec;

  public ConfrontoService(
      BollettaService bollette,
      OffertaService offerte,
      ParametriService parametri,
      MotoreCalcolo motore,
      ConfrontoRepository repository,
      JsonCodec codec) {
    this.bollette = bollette;
    this.offerte = offerte;
    this.parametri = parametri;
    this.motore = motore;
    this.repository = repository;
    this.codec = codec;
  }

  @Transactional(isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public Risposta crea(Richiesta r) {
    var b = bollette.trova(r.bollettaId());
    var o = offerte.trova(r.offertaId());
    var p = parametri.leggi();
    var snapshot =
        new Snapshot("1.0", b.getId(), b.dati(), OffertaResponse.da(o), p, motore.calcola(b, o, p));
    return risposta(repository.saveAndFlush(new Confronto(codec.scrivi(snapshot))));
  }

  @Transactional(readOnly = true)
  public List<Risposta> lista() {
    return repository.findAll(org.springframework.data.domain.Sort.by("id").descending()).stream()
        .map(this::risposta)
        .toList();
  }

  @Transactional(readOnly = true)
  public Risposta leggi(Long id) {
    return risposta(
        repository.findById(id).orElseThrow(() -> new NotFoundException("Confronto non trovato")));
  }

  private Risposta risposta(Confronto c) {
    return new Risposta(c.getId(), c.getCreatoIl(), codec.leggi(c.getSnapshot(), Snapshot.class));
  }
}
