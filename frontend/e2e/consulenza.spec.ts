import { test, expect } from "@playwright/test";

test("una consulenza completa: parametri, offerta, bolletta, confronto e storico", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Content Security Policy|frame-ancestors|frame-src/.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto("/parametri");
  await page.getByLabel("Nome del profilo").fill("Profilo test browser");
  await page
    .getByLabel("Fonte e periodo dei valori")
    .fill("Dati sintetici per verifica");
  for (const label of [
    "Coefficiente perdite",
    "Dispacciamento (€/kWh con perdite)",
    "Quota fissa (€/mese)",
    "Quota potenza (€/kW/anno)",
    "Quota energia (€/kWh netti)",
    "Oneri fissi (€/mese)",
    "Oneri variabili (€/kWh netti)",
    "Accisa (€/kWh netti)",
  ])
    await page.getByLabel(label).fill("0");
  await page.getByRole("button", { name: "Salva parametri" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Parametri salvati" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Offerte", exact: true }).click();
  await page.getByRole("button", { name: "Nuova offerta" }).click();
  await page.getByLabel("Nome offerta").fill("Luce Fissa Browser");
  await page.getByLabel("Fornitore").fill("Gestore test");
  await page.getByLabel("Prezzo F0").fill("0.10");
  await page.getByLabel("PCV annuo (€)").fill("120");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Offerta salvata" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Bollette clienti" }).click();
  await page.getByRole("button", { name: "Nuova bolletta" }).click();
  await page.getByLabel("Cliente").fill("Cliente Browser");
  await page.getByLabel("POD").fill("POD-BROWSER");
  await page.getByLabel("Fornitore attuale").fill("Concorrente test");
  await page.getByLabel("Totale fatturato (€)").fill("200");
  await page.getByLabel("Mese di riferimento").fill("2026-01");
  await page.getByLabel("F1 (kWh)").fill("100");
  await page.getByLabel("F2 (kWh)").fill("200");
  await page.getByLabel("F3 (kWh)").fill("300");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Bolletta salvata" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Confronto", exact: true }).click();
  await page
    .getByLabel("Bolletta del cliente")
    .selectOption({ label: "Cliente Browser · 2026-01" });
  await page
    .getByLabel("Offerta proposta")
    .selectOption({ label: "Luce Fissa Browser · Gestore test" });
  await page.getByRole("button", { name: "Calcola confronto" }).click();
  await expect(
    page.getByRole("region", { name: "Risultato del confronto" }),
  ).toContainText("77,00");
  await expect(
    page.getByRole("region", { name: "Risultato del confronto" }),
  ).toContainText("123,00");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica PDF", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^confronto-\d+\.pdf$/);
  await download.saveAs("test-results/confronto-esempio.pdf");
  expect(await download.failure()).toBeNull();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/confronto-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("navigation", { name: "Navigazione principale" })
    .getByRole("link", { name: "Impostazioni PDF", exact: true })
    .click();
  await expect(page.getByText("PDF aggiornato · formato A4")).toBeVisible();
  await page.getByRole("radio", { name: /Sintesi cliente/ }).check();
  await page.getByRole("button", { name: "Blu Istituzionale" }).click();
  await page.getByLabel("Nome o studio").fill("Studio Browser PDF");
  await page.getByLabel("Carica il tuo logo").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAYAAAAnSfh8AAABCklEQVR4nO3TQQ3AIADAwDEhCEEippmHfUiTOwX9dMy1zwMkvbcDgP8MDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCPsAaBECgTfwPnMAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByAltText("Logo scelto per il report")).toBeVisible();
  await expect(page.getByText("PDF aggiornato · formato A4")).toBeVisible();
  await expect(
    page.getByAltText("Anteprima PDF · pagina 1 di 3"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByAltText("Anteprima PDF · pagina 1 di 3")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBeTruthy();
  await page.locator(".pdf-editor-controls").evaluate((e) => {
    e.scrollTop = 0;
  });
  await page.screenshot({
    path: "test-results/editor-pdf-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(await page.locator(".pdf-preview-sheet").count()).toBe(1);
  const sheet = await page.locator(".pdf-preview-sheet").boundingBox();
  const previewArea = await page.locator(".pdf-preview-document").boundingBox();
  expect(
    sheet &&
      previewArea &&
      sheet.y >= previewArea.y &&
      sheet.y + sheet.height <= previewArea.y + previewArea.height + 1,
  ).toBeTruthy();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const controlsWide = await page.locator(".pdf-editor-controls").boundingBox();
  const sheetWide = await page.locator(".pdf-preview-sheet").boundingBox();
  const editorWide = await page.locator(".pdf-settings-editor").boundingBox();
  expect(controlsWide?.width).toBeGreaterThan(500);
  expect(sheetWide?.width).toBeGreaterThan(400);
  expect(editorWide && editorWide.y + editorWide.height <= 1080).toBeTruthy();
  await page.screenshot({
    path: "test-results/editor-pdf-ampio.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("button", { name: "Pagina successiva" }).click();
  await expect(
    page.getByAltText("Anteprima PDF · pagina 2 di 3"),
  ).toBeVisible();
  expect(await page.locator(".pdf-preview-sheet").count()).toBe(1);
  await page.getByRole("button", { name: "Pagina precedente" }).click();
  await page.getByRole("button", { name: "Salva impostazioni PDF" }).click();
  await expect(page.getByText(/Impostazioni PDF salvate/)).toBeVisible();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Nome o studio")).toHaveValue(
    "Studio Browser PDF",
  );
  await expect(page.getByLabel("Codice colore")).toHaveValue("#1E3A8A");
  await expect(page.getByAltText("Logo scelto per il report")).toBeVisible();
  const customDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica PDF di esempio" }).click();
  const customDownload = await customDownloadPromise;
  await customDownload.saveAs("test-results/pdf-esempio-impostazioni.pdf");
  expect(await customDownload.failure()).toBeNull();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator(".pdf-settings-editor")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/editor-pdf-mobile.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Apri menu" }).click();
  await page.getByRole("link", { name: "Storico", exact: true }).click();
  await page.getByRole("button", { name: "Apri", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.locator(".chart").evaluate((container) => {
        const svg = container.querySelector("svg.recharts-surface");
        return (
          !!svg &&
          Math.abs(
            svg.getBoundingClientRect().width -
              container.getBoundingClientRect().width,
          ) < 2
        );
      }),
    )
    .toBeTruthy();
  await page.getByRole("heading", { name: "Storico confronti" }).hover();
  console.log(
    "Mobile overflow",
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      elements: [...document.querySelectorAll("body *")]
        .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 12)
        .map((e) => ({
          tag: e.tagName,
          classes: e.className,
          right: e.getBoundingClientRect().right,
        })),
    })),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "test-results/confronto-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await expect(
    page.getByRole("region", { name: "Risultato del confronto" }),
  ).toContainText("77,00");
  const storicoDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica PDF", exact: true }).click();
  const storicoPdf = await storicoDownloadPromise;
  expect(storicoPdf.suggestedFilename()).toBe(download.suggestedFilename());
  await storicoPdf.saveAs("test-results/confronto-personalizzato.pdf");
  expect(await storicoPdf.failure()).toBeNull();
  expect(errors).toEqual([]);
});
