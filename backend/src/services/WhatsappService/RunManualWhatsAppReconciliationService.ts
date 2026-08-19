interface Request {
  whatsappId: number;
}

const RunManualWhatsAppReconciliationService = async ({
  whatsappId
}: Request) => {
  /*
   * Keep the WWebJS implementation lazy here.
   * Controllers and unrelated tests must not load Puppeteer
   * merely by importing this service.
   */
  const {
    runManualWWebJsReconciliationForSession
  } = await import(
    "../../providers/WhatsApp/Implementations/wwebjs"
  );

  return runManualWWebJsReconciliationForSession(
    whatsappId
  );
};

export default RunManualWhatsAppReconciliationService;