import { test, expect } from "@playwright/test";
test("profilo business, simulazione, PDF, versioni e vista mobile", async ({
  page,
}) => {
  await page.goto("/tariffe");
  await page.getByRole("button", { name: "Sblocca tariffe" }).click();
  await page
    .getByLabel("Chiave amministratore")
    .fill(process.env.BUSINESS_ADMIN_TOKEN ?? "demo-business-local");
  await page.getByRole("button", { name: "Sblocca modifiche" }).click();
  await page.getByRole("button", { name: "Nuovo profilo" }).click();
  await page
    .getByLabel("Nome offerta / profilo")
    .fill("Profilo browser business");
  await page
    .getByLabel("Fonte dei corrispettivi")
    .fill("Fixture sintetica browser");
  await page.getByLabel("Valido dal").fill("2026-01");
  await page.getByLabel("Valido fino al").fill("2026-12");
  for (const i of [1, 2, 3, 4, 5, 6])
    await page
      .getByRole("spinbutton", { name: `Corrispettivo voce ${i}`, exact: true })
      .fill("0.1");
  await page
    .getByRole("spinbutton", { name: "Corrispettivo voce 7", exact: true })
    .fill("120");
  await page.getByRole("button", { name: "Salva profilo tariffario" }).click();
  await expect(
    page.getByRole("heading", { name: "Profilo browser business" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Simulatore", exact: true }).click();
  await page.getByLabel("Ragione sociale").fill("Impresa browser");
  await page
    .getByRole("textbox", { name: "POD", exact: true })
    .fill("IT001E00000000");
  await page.getByLabel("Potenza impegnata (kW)").fill("17.8");
  await page.getByLabel("Fattura precedente (€)").fill("200");
  await page.getByLabel("Periodo mese 1").fill("2026-01");
  await page
    .getByLabel("Profilo tariffario mese 1")
    .selectOption({ label: "Profilo browser business · v0 · bozza" });
  await page.getByLabel("Applica le quote fisse").uncheck();
  await page.getByRole("button", { name: "Aggiungi mese" }).click();
  for (const f of ["F1", "F2", "F3"])
    await page.getByLabel(`${f} mese 2 (kWh)`).fill("200");
  await page.getByLabel("La fattura precedente riguarda").check();
  await page
    .getByRole("button", { name: "Calcola e salva simulazione" })
    .click();
  await expect(
    page.getByRole("region", { name: "Risultato business" }),
  ).toBeVisible();
  await expect(
    page.getByText("92,72 €", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("107,28 €", { exact: true })).toBeVisible();
  await expect(page.getByText("643,68 €", { exact: true })).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica PDF" }).click();
  const download = await dl;
  await download.saveAs("test-results/business-example.pdf");
  expect(download.suggestedFilename()).toMatch(
    /^simulazione-business-\d+\.pdf$/,
  );
  await page.getByRole("link", { name: "Storico", exact: true }).click();
  await page.getByRole("button", { name: "Apri", exact: true }).first().click();
  await expect(
    page.getByText("92,72 €", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Offerte e tariffe", exact: true })
    .click();
  await page.getByRole("button", { name: "Sblocca tariffe" }).click();
  await page
    .getByLabel("Chiave amministratore")
    .fill(process.env.BUSINESS_ADMIN_TOKEN ?? "demo-business-local");
  await page.getByRole("button", { name: "Sblocca modifiche" }).click();
  await page
    .getByRole("button", { name: "Modifica", exact: true })
    .first()
    .click();
  await page
    .getByRole("spinbutton", { name: "Corrispettivo voce 7", exact: true })
    .fill("240");
  await page.getByRole("button", { name: "Salva profilo tariffario" }).click();
  await expect(page.getByText("v1", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Revisioni", exact: true })
    .first()
    .click();
  await expect(page.getByText(/Versione 0/)).toBeVisible();
  await page.getByRole("button", { name: "Chiudi", exact: true }).click();
  await page.getByRole("link", { name: "Storico", exact: true }).click();
  await page.getByRole("button", { name: "Apri", exact: true }).first().click();
  await expect(
    page.getByText("92,72 €", { exact: true }).first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBeTruthy();
  await expect
    .poll(
      async () =>
        (await page.locator(".sidebar").boundingBox())!.x +
        (await page.locator(".sidebar").boundingBox())!.width,
    )
    .toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Apri menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Chiudi menu", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chiudi menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apri menu", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: "test-results/business-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    animations: "disabled",
    path: "test-results/business-desktop.png",
    fullPage: true,
  });
});
