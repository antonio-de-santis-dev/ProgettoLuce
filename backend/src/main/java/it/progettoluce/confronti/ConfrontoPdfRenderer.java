package it.progettoluce.confronti;

import java.awt.Color;
import java.io.*;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.stereotype.Component;

/** Renders the saved snapshot, without recalculating or reading live commercial conditions. */
@Component
public class ConfrontoPdfRenderer {
  public byte[] genera(ConfrontoService.Risposta confronto) throws IOException {
    try (PDDocument document = new PDDocument();
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      var info = document.getDocumentInformation();
      info.setTitle("ProgettoLuce - Confronto #" + confronto.id());
      info.setAuthor("ProgettoLuce");
      info.setSubject("Simulazione parametrica dei costi dell'energia elettrica");
      try (Layout l = new Layout(document, confronto.id())) {
        var s = confronto.dati();
        var b = s.bolletta();
        var o = s.offerta();
        var p = s.parametri();
        var r = s.risultato();
        l.section("Cliente e proposta");
        l.field("Cliente", b.cliente());
        l.field("POD / fornitore attuale", b.pod() + " / " + b.fornitore());
        l.field("Offerta proposta", o.nomeOfferta() + " / " + o.nomeFornitore());
        l.field(
            "Condizioni",
            (o.tipoOfferta() == it.progettoluce.offerte.TipoOfferta.PREZZO_FISSO
                    ? "Prezzo fisso"
                    : "Indicizzata PUN")
                + " · "
                + o.tipoTariffa().name().toLowerCase(Locale.ITALY)
                + " · PCV "
                + money(o.pcvAnnuo())
                + "/anno");
        for (var voce : o.voci())
          if (voce.tipo().equals("ENERGIA"))
            l.field(
                (voce.indicizzata() ? "Spread " : "Prezzo ") + voce.fascia(),
                number(voce.corrispettivo()) + " €/kWh");
        l.field(
            "Periodo e potenza",
            b.mesi().get(0).mese()
                + " → "
                + b.mesi().get(b.mesi().size() - 1).mese()
                + " · "
                + r.numeroMesi()
                + (r.numeroMesi() == 1 ? " mese · " : " mesi · ")
                + number(b.potenzaKw())
                + " kW");
        l.field(
            "Confronto salvato",
            DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm z")
                    .withZone(ZoneId.of("Europe/Rome"))
                    .format(confronto.creatoIl())
                + " · Motore "
                + s.versioneMotore());
        l.metrics(b.totaleFatturato(), r.totale(), r.risparmioPeriodo());
        l.row(
            "Variazione sul costo attuale",
            r.risparmioPercentuale() == null
                ? "Non disponibile (totale attuale zero)"
                : number(r.risparmioPercentuale().abs())
                    + "% "
                    + (r.risparmioPeriodo().signum() >= 0 ? "in meno" : "in più"));
        l.section("Composizione del costo proposto");
        for (var entry : r.categorie().entrySet())
          l.row(category(entry.getKey()), money(entry.getValue()));
        l.row("Imponibile arrotondato", money(r.imponibile()));
        l.row(
            "IVA " + number(b.aliquotaIva().multiply(new BigDecimal("100"))) + "%", money(r.iva()));
        l.row("Altre partite esenti IVA", money(r.altrePartiteEsenti()));
        l.row("Totale offerta proposta (IVA inclusa)", money(r.totale()));
        l.section("Proiezione annuale indicativa");
        l.paragraph(
            (r.stimaRisparmioAnnuale().signum() >= 0
                    ? "Risparmio annuo indicativo: "
                    : "Maggior costo annuo indicativo: ")
                + money(r.stimaRisparmioAnnuale().abs()),
            true);
        l.paragraph(r.notaStima(), false);
        l.paragraph(
            "Le categorie sono visualizzate a centesimi; il motore somma le righe precise e"
                + " arrotonda l'imponibile una sola volta.",
            false);
        l.section("Dettaglio del calcolo · " + r.righe().size() + " righe");
        String[] headings = {"Mese", "Voce", "Quantità", "Corrispettivo", "Importo"};
        l.tableHeader(headings);
        int index = 0;
        for (var line : r.righe()) {
          l.tableRow(
              new String[] {
                line.mese(),
                line.descrizione(),
                number(line.quantita()),
                number(line.corrispettivo()) + " " + line.unita(),
                number(line.importo()) + " €"
              },
              headings,
              index++);
        }
        l.section("Consumi e PUN del periodo");
        for (var month : b.mesi()) {
          l.paragraph(
              month.mese()
                  + " · F1 "
                  + number(month.f1())
                  + " kWh · F2 "
                  + number(month.f2())
                  + " kWh · F3 "
                  + number(month.f3())
                  + " kWh",
              true);
          if (month.pun() != null) {
            var values = new ArrayList<String>();
            for (var fascia : it.progettoluce.offerte.Fascia.values()) {
              var value = month.pun().valore(fascia);
              if (value != null) values.add(fascia + " " + number(value) + " €/kWh");
            }
            if (!values.isEmpty()) l.paragraph("PUN: " + String.join(" · ", values), false);
          }
        }
        l.section("Parametri utilizzati");
        l.field("Profilo / fonte", p.nomeProfilo() + " / " + p.fonte());
        l.row(
            "Perdite",
            number(p.coefficientePerdite().multiply(new BigDecimal("100")))
                + "% · arrotondamento "
                + (p.arrotondaPerdite() ? "a kWh interi" : "decimale"));
        l.row("Dispacciamento (con perdite)", number(p.dispacciamentoKwh()) + " €/kWh");
        l.row("Trasporto fisso", number(p.trasportoFissoMese()) + " €/mese");
        l.row("Trasporto potenza", number(p.trasportoPotenzaAnno()) + " €/kW/anno");
        l.row("Trasporto variabile (netto)", number(p.trasportoKwh()) + " €/kWh");
        l.row("Oneri fissi", number(p.oneriFissiMese()) + " €/mese");
        l.row("Oneri variabili (netti)", number(p.oneriKwh()) + " €/kWh");
        l.row("Accisa uniforme (netta)", number(p.accisaKwh()) + " €/kWh");
        if (o.note() != null && !o.note().isBlank()) l.field("Note offerta", o.note());
        l.section("Limiti della simulazione");
        l.paragraph(
            "Simulazione parametrica, non fattura o preventivo contrattuale. Nessuna certificazione"
                + " ARERA. Esenzioni, scaglioni, periodi parziali e IVA mista non sono modellati."
                + " PUN inserito manualmente. Le altre partite sono riportate su entrambi i lati:"
                + " verificare che siano trasferibili.",
            false);
        l.paragraph(
            "Il documento utilizza esclusivamente i dati del confronto salvato #"
                + confronto.id()
                + ". Modifiche successive a offerte, bollette o parametri non aggiornano questo"
                + " risultato.",
            false);
        if (l.substitutions)
          l.paragraph(
              "Alcuni caratteri non disponibili nel font sono rappresentati con ?. I dati originali"
                  + " restano nello storico.",
              false);
      }
      document.save(output);
      return output.toByteArray();
    }
  }

  private static String category(String key) {
    return switch (key) {
      case "ENERGIA" -> "Materia energia (inclusa PCV)";
      case "TRASPORTO" -> "Trasporto e contatore";
      case "ONERI" -> "Oneri di sistema";
      case "IMPOSTE" -> "Accisa configurata";
      case "ALTRE_PARTITE" -> "Altre partite imponibili";
      default -> key;
    };
  }

  private static String money(BigDecimal value) {
    var format = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.ITALY));
    format.setRoundingMode(java.math.RoundingMode.HALF_UP);
    return format.format(value) + " €";
  }

  private static String number(BigDecimal value) {
    return value.stripTrailingZeros().toPlainString().replace('.', ',');
  }

  private static final class Layout implements AutoCloseable {
    private static final float LEFT = 42, WIDTH = PDRectangle.A4.getWidth() - 84;
    private static final float[] COLUMNS = {55, 163, 83, 105, WIDTH - 406};
    private static final Color GREEN = new Color(25, 77, 61),
        INK = new Color(32, 51, 43),
        MUTED = new Color(99, 115, 107),
        PALE = new Color(240, 244, 235);
    private final PDDocument document;
    private final PDType0Font regular, bold;
    private final Long id;
    private PDPageContentStream stream;
    private float y;
    private boolean substitutions;

    Layout(PDDocument document, Long id) throws IOException {
      this.document = document;
      this.id = id;
      regular = font(document, "DejaVuSans.ttf");
      bold = font(document, "DejaVuSans-Bold.ttf");
      newPage();
    }

    private static PDType0Font font(PDDocument document, String name) throws IOException {
      try (var input = ConfrontoPdfRenderer.class.getResourceAsStream("/fonts/" + name)) {
        if (input == null) throw new IOException("Font PDF mancante: " + name);
        return PDType0Font.load(document, input, true);
      }
    }

    void newPage() throws IOException {
      if (stream != null) stream.close();
      var page = new PDPage(PDRectangle.A4);
      document.addPage(page);
      stream = new PDPageContentStream(document, page);
      box(0, 747, PDRectangle.A4.getWidth(), 95, GREEN);
      text("progetto luce.", LEFT, 803, bold, 20, Color.WHITE);
      text("CONFRONTO ENERGIA ELETTRICA", LEFT, 777, regular, 10, Color.WHITE);
      text("REPORT #" + id, PDRectangle.A4.getWidth() - 145, 803, bold, 10, Color.WHITE);
      y = 721;
    }

    void ensure(float height) throws IOException {
      if (y - height < 65) newPage();
    }

    void section(String value) throws IOException {
      ensure(90);
      y -= 8;
      text(value, LEFT, y, bold, 13, GREEN);
      y -= 12;
      box(LEFT, y, WIDTH, 1, PALE);
      y -= 11;
    }

    void field(String label, String value) throws IOException {
      var lines = wrap(value, regular, 10, WIDTH);
      ensure(15 + lines.size() * 12);
      text(label.toUpperCase(Locale.ITALY), LEFT, y, bold, 8, MUTED);
      y -= 12;
      for (String line : lines) {
        ensure(12);
        text(line, LEFT, y, regular, 10, INK);
        y -= 12;
      }
      y -= 3;
    }

    void paragraph(String value, boolean strong) throws IOException {
      var font = strong ? bold : regular;
      var lines = wrap(value, font, 9, WIDTH);
      ensure(Math.min(lines.size() * 13 + 6, 170));
      for (String line : lines) {
        ensure(13);
        text(line, LEFT, y, font, 9, INK);
        y -= 13;
      }
      y -= 6;
    }

    void row(String label, String value) throws IOException {
      var labels = wrap(label, regular, 9, WIDTH * .60f);
      var values = wrap(value, bold, 9, WIDTH * .37f);
      float height = Math.max(labels.size(), values.size()) * 13 + 7;
      ensure(height);
      for (int i = 0; i < labels.size(); i++)
        text(labels.get(i), LEFT, y - i * 13, regular, 9, INK);
      for (int i = 0; i < values.size(); i++) {
        String line = values.get(i);
        text(line, LEFT + WIDTH - bold.getStringWidth(line) / 1000 * 9, y - i * 13, bold, 9, INK);
      }
      y -= height;
    }

    void metrics(BigDecimal current, BigDecimal proposed, BigDecimal saving) throws IOException {
      ensure(90);
      String[] labels = {
        "Bolletta attuale",
        "Offerta proposta",
        saving.signum() >= 0 ? "Risparmio periodo" : "Maggior costo"
      };
      String[] values = {money(current), money(proposed), money(saving.abs())};
      float w = (WIDTH - 20) / 3;
      for (int i = 0; i < 3; i++) {
        float x = LEFT + i * (w + 10);
        box(x, y - 68, w, 72, PALE);
        text(labels[i], x + 10, y - 15, regular, 8, MUTED);
        float size = 18;
        while (bold.getStringWidth(values[i]) / 1000 * size > w - 20) size--;
        text(values[i], x + 10, y - 44, bold, size, GREEN);
      }
      y -= 87;
    }

    void tableHeader(String[] headings) throws IOException {
      ensure(30);
      box(LEFT, y - 21, WIDTH, 26, GREEN);
      float x = LEFT;
      for (int i = 0; i < headings.length; i++) {
        text(headings[i], x + 5, y - 12, bold, 8, Color.WHITE);
        x += COLUMNS[i];
      }
      y -= 32;
    }

    void tableRow(String[] cells, String[] headings, int index) throws IOException {
      var lines = new ArrayList<List<String>>();
      int count = 1;
      for (int i = 0; i < cells.length; i++) {
        var wrapped = wrap(cells[i], regular, 7.5f, COLUMNS[i] - 10);
        lines.add(wrapped);
        count = Math.max(count, wrapped.size());
      }
      float height = count * 11 + 8;
      if (y - height < 65) {
        newPage();
        tableHeader(headings);
      }
      if (index % 2 == 0) box(LEFT, y - height + 5, WIDTH, height, PALE);
      float x = LEFT;
      for (int i = 0; i < cells.length; i++) {
        for (int j = 0; j < lines.get(i).size(); j++)
          text(lines.get(i).get(j), x + 5, y - 8 - j * 11, regular, 7.5f, INK);
        x += COLUMNS[i];
      }
      y -= height;
    }

    private List<String> wrap(String raw, PDFont font, float size, float width) throws IOException {
      String value = safe(raw, font).replaceAll("\\s+", " ").trim();
      var lines = new ArrayList<String>();
      StringBuilder line = new StringBuilder();
      for (int offset = 0; offset < value.length(); ) {
        int cp = value.codePointAt(offset);
        offset += Character.charCount(cp);
        String c = new String(Character.toChars(cp));
        if (font.getStringWidth(line + c) / 1000 * size > width && !line.isEmpty()) {
          int space = line.lastIndexOf(" ");
          if (space > 0) {
            lines.add(line.substring(0, space));
            line = new StringBuilder(line.substring(space + 1));
          } else {
            lines.add(line.toString());
            line.setLength(0);
          }
        }
        line.append(c);
      }
      if (!line.isEmpty()) lines.add(line.toString().trim());
      if (lines.isEmpty()) lines.add("");
      return lines;
    }

    private String safe(String value, PDFont font) throws IOException {
      var result = new StringBuilder();
      for (int offset = 0; offset < value.length(); ) {
        int cp = value.codePointAt(offset);
        offset += Character.charCount(cp);
        if (Character.isWhitespace(cp) || Character.isISOControl(cp)) {
          result.append(' ');
          continue;
        }
        String c = new String(Character.toChars(cp));
        try {
          font.encode(c);
          result.append(c);
        } catch (IllegalArgumentException e) {
          result.append('?');
          substitutions = true;
        }
      }
      return result.toString();
    }

    private void box(float x, float bottom, float width, float height, Color color)
        throws IOException {
      stream.setNonStrokingColor(color);
      stream.addRect(x, bottom, width, height);
      stream.fill();
    }

    private void text(String value, float x, float baseline, PDFont font, float size, Color color)
        throws IOException {
      stream.beginText();
      stream.setFont(font, size);
      stream.setNonStrokingColor(color);
      stream.newLineAtOffset(x, baseline);
      stream.showText(safe(value, font));
      stream.endText();
    }

    @Override
    public void close() throws IOException {
      stream.close();
      for (int i = 0; i < document.getNumberOfPages(); i++) {
        try (var footer =
            new PDPageContentStream(
                document, document.getPage(i), PDPageContentStream.AppendMode.APPEND, true, true)) {
          footer.beginText();
          footer.setFont(regular, 8);
          footer.setNonStrokingColor(MUTED);
          footer.newLineAtOffset(LEFT, 35);
          footer.showText("ProgettoLuce · Confronto #" + id + " · Simulazione parametrica");
          footer.endText();
          footer.beginText();
          footer.setFont(regular, 8);
          footer.newLineAtOffset(LEFT + WIDTH - 62, 35);
          footer.showText((i + 1) + " / " + document.getNumberOfPages());
          footer.endText();
        }
      }
    }
  }
}
