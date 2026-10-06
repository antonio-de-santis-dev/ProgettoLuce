import { useState } from "react";
import { Download, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { api } from "../api";
import { Errore } from "./ui";
import PdfEditor from "./PdfEditor";
import {
  downloadPdf,
  errorePdf,
  leggiPdfOptions,
  verificaPdf,
} from "./pdfPersonalizzazione";

export default function ScaricaPdf({ id }: { id: number }) {
  const [editor, setEditor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function scarica() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const options = leggiPdfOptions();
      const { data } = options
        ? await api.post<Blob>(`/confronti/${id}/pdf`, options, {
            responseType: "blob",
          })
        : await api.get<Blob>(`/confronti/${id}/pdf`, { responseType: "blob" });
      verificaPdf(data);
      downloadPdf(data, id);
      setNotice("Download PDF avviato.");
    } catch (e) {
      setError(await errorePdf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pdf-download">
      <button
        type="button"
        className="button secondary"
        onClick={() => setEditor(true)}
      >
        <SlidersHorizontal size={18} />
        Personalizza PDF
      </button>
      {editor && <PdfEditor id={id} onClose={() => setEditor(false)} />}
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={scarica}
      >
        {busy ? (
          <LoaderCircle size={18} className="spin" />
        ) : (
          <Download size={18} />
        )}
        {busy ? "Preparazione PDF…" : "Scarica PDF"}
      </button>
      {notice && <small role="status">{notice}</small>}
      {error && <Errore message={error} />}
    </div>
  );
}
