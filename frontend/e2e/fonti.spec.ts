import { test, expect } from "@playwright/test";
test("fonti ufficiali: inserimento manuale, storico e vista mobile", async ({
  page,
}) => {
  await page.goto("/fonti");
  await expect(
    page.getByRole("heading", { name: "Fonti ufficiali", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Mese", { exact: true }).fill("2025-12");
  await page.getByLabel("Profilo", { exact: true }).selectOption("INDICE");
  await page.getByLabel("Parametro", { exact: true }).selectOption("PUN_F0");
  await page.getByLabel("Valore", { exact: true }).fill("0.12");
  await page
    .getByLabel("Motivo della correzione / fonte verificata")
    .fill("Fixture sintetica browser");
  await page.getByRole("button", { name: "Salva valore manuale" }).click();
  await expect(page.getByRole("status")).toContainText("Correzione salvata");
  await page.getByRole("button", { name: "Modifica", exact: true }).click();
  await expect(page.getByLabel("Valore (€/kWh)")).toHaveValue("0.12000000");
  await page.getByRole("button", { name: "Annulla modifica" }).click();
  await page
    .getByRole("button", { name: "Storico PUN · monorario F0" })
    .click();
  await expect(
    page.getByText("Fixture sintetica browser", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Fonti ufficiali", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
