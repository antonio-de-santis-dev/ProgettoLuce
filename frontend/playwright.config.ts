import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.CHROME_EXECUTABLE_PATH },
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "java -jar ../backend/target/progetto-luce-0.1.0.jar --spring.profiles.active=demo --server.port=8081 --spring.datasource.url='jdbc:h2:mem:luce-e2e;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH'",
      url: "http://127.0.0.1:8081/actuator/health",
      timeout: 60000,
    },
    {
      command: "npm run preview -- --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174",
      env: { LUCE_API_TARGET: "http://127.0.0.1:8081" },
      timeout: 60000,
    },
  ],
});
