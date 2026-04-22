async function main(): Promise<void> {
  const url = "http://localhost:3000/manifest.json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    if (response.ok) {
      console.log(`validate-pwa: OK (${response.status})`);
      process.exit(0);
    }
    console.error(`validate-pwa: FAIL (${response.status})`);
    process.exit(1);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "timeout"
      : "request error";
    console.error(`validate-pwa: FAIL (${message})`);
    console.error(error);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

void main();
