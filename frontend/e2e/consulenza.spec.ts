import { test, expect } from "@playwright/test";

test("una consulenza completa: parametri, offerta, bolletta, confronto e storico", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
  await page.screenshot({
    path: "test-results/confronto-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/confronto-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Apri menu" }).click();
  await page.getByRole("link", { name: "Storico", exact: true }).click();
  await expect(
    page.getByText("Cliente Browser", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apri", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Risultato del confronto" }),
  ).toContainText("77,00");
  expect(errors).toEqual([]);
});
