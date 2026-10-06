import { useState } from "react";
import axios from "axios";
import { Download, LoaderCircle } from "lucide-react";
import { api, messaggioErrore } from "../api";
import { Errore } from "./ui";

export default function ScaricaPdf({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function scarica() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.get<Blob>(`/confronti/${id}/pdf`, {
        responseType: "blob",
      });
      if (!data.type.includes("application/pdf"))
        throw new Error("Il server non ha restituito un PDF valido.");
      const url = URL.createObjectURL(data);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `confronto-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setNotice("Download PDF avviato.");
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      let message = messaggioErrore(e);
      if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
        try {
          const data = JSON.parse(await e.response.data.text());
          if (typeof data.message === "string") message = data.message;
        } catch {
          /* Keep the generic error when the response is not JSON. */
        }
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pdf-download">
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
