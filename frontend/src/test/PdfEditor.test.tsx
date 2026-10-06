import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import PdfEditor from "../components/PdfEditor";
import ScaricaPdf from "../components/ScaricaPdf";
import {
  defaultPdf,
  leggiLogo,
  salvaPdfOptions,
} from "../components/pdfPersonalizzazione";
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});
const pdf = () => new Blob(["%PDF-1.7"], { type: "application/pdf" });
const anteprima = () => ({
  pdfBase64: "JVBERi0xLjc=",
  pagine: ["data:image/png;base64,AA=="],
});
describe("Editor PDF", () => {
  it("aggiorna le opzioni e scarica esattamente il PDF visualizzato", async () => {
    const data = anteprima();
    const post = vi.spyOn(api, "post").mockResolvedValue({ data });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("confronto-42.pdf");
      });
    const view = render(<PdfEditor id={42} onClose={vi.fn()} />);
    await screen.findByText("PDF aggiornato · formato A4");
    await userEvent.click(
      screen.getByRole("radio", { name: /Sintesi cliente/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Blu Istituzionale" }),
    );
    const name = screen.getByLabelText("Nome o studio");
    await userEvent.clear(name);
    await userEvent.type(name, "Studio Test");
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(
        "/confronti/42/pdf/anteprima",
        expect.objectContaining({
          stile: "SINTESI",
          colore: "#1E3A8A",
          consulente: expect.objectContaining({ nome: "Studio Test" }),
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    await screen.findByText("PDF aggiornato · formato A4");
    const count = post.mock.calls.length;
    await userEvent.click(
      screen.getByRole("button", { name: "Scarica PDF personalizzato" }),
    );
    expect(click).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledTimes(count);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(screen.getByAltText("Anteprima PDF · pagina 1 di 1")).toBeVisible();
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });
  it("ignora risposte obsolete durante un aggiornamento", async () => {
    let resolveFirst!: (data: { data: ReturnType<typeof anteprima> }) => void;
    const first = new Promise<{ data: ReturnType<typeof anteprima> }>(
      (resolve) => {
        resolveFirst = resolve;
      },
    );
    const post = vi
      .spyOn(api, "post")
      .mockReturnValueOnce(first)
      .mockResolvedValue({ data: anteprima() });
    render(<PdfEditor id={2} onClose={vi.fn()} />);
    await waitFor(() => expect(post).toHaveBeenCalledOnce());
    await userEvent.click(screen.getByRole("radio", { name: /Essenziale/ }));
    expect(
      screen.getByRole("button", { name: "Scarica PDF personalizzato" }),
    ).toHaveAttribute("aria-disabled", "true");
    await screen.findByText("PDF aggiornato · formato A4");
    const count = vi.mocked(URL.createObjectURL).mock.calls.length;
    resolveFirst({ data: anteprima() });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(count);
    expect(post.mock.calls[0]?.[2]?.signal?.aborted).toBe(true);
  });
  it("consente un nuovo tentativo dopo un errore", async () => {
    vi.spyOn(api, "post")
      .mockRejectedValueOnce(
        new Error("Servizio temporaneamente indisponibile"),
      )
      .mockResolvedValue({ data: anteprima() });
    render(<PdfEditor id={3} onClose={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Servizio temporaneamente indisponibile",
    );
    await userEvent.click(screen.getByRole("button", { name: "Riprova" }));
    await screen.findByText("PDF aggiornato · formato A4");
  });
  it("riutilizza le preferenze nel download dal risultato", async () => {
    salvaPdfOptions({ ...defaultPdf, stile: "EDITORIALE", colore: "#6B21A8" });
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: pdf() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ScaricaPdf id={8} />);
    await userEvent.click(
      screen.getByRole("button", { name: /^Scarica PDF$/ }),
    );
    expect(post).toHaveBeenCalledWith(
      "/confronti/8/pdf",
      expect.objectContaining({ stile: "EDITORIALE", colore: "#6B21A8" }),
      { responseType: "blob" },
    );
    localStorage.clear();
  });
  it("rifiuta loghi non supportati o troppo grandi", async () => {
    await expect(
      leggiLogo(new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow("PNG o JPEG");
    await expect(
      leggiLogo(
        new File([new Uint8Array(1048577)], "logo.png", { type: "image/png" }),
      ),
    ).rejects.toThrow("1 MB");
  });
});
