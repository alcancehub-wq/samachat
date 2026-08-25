import CloudApiClient, {
  buildCloudApiMediaUrl
} from "../CloudApiClient";

describe("CloudApiClient media", () => {
  it("builds the media endpoint using the configured version", () => {
    expect(
      buildCloudApiMediaUrl("629748506897910", "v20.0")
    ).toBe(
      "https://graph.facebook.com/v20.0/629748506897910/media"
    );
  });

  it("sends an image using an uploaded media id", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        messages: [{ id: "wamid.image" }]
      })
    });

    const client = new CloudApiClient(
      {
        accessToken: "test-token",
        phoneNumberId: "629748506897910",
        apiVersion: "v20.0"
      },
      executor
    );

    const result = await client.sendMedia({
      to: "+55 (11) 99999-9999",
      mediaId: "media-image-1",
      type: "image",
      caption: "imagem teste"
    });

    expect(result.messages?.[0]?.id).toBe("wamid.image");

    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/629748506897910/messages",
      "test-token",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "5511999999999",
        type: "image",
        image: {
          id: "media-image-1",
          caption: "imagem teste"
        }
      }
    );
  });

  it("sends a document preserving filename and caption", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        messages: [{ id: "wamid.document" }]
      })
    });

    const client = new CloudApiClient(
      {
        accessToken: "test-token",
        phoneNumberId: "629748506897910",
        apiVersion: "20.0"
      },
      executor
    );

    await client.sendMedia({
      to: "5511987654321",
      mediaId: "media-document-1",
      type: "document",
      filename: "contrato.pdf",
      caption: "Contrato"
    });

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/629748506897910/messages",
      "test-token",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "5511987654321",
        type: "document",
        document: {
          id: "media-document-1",
          caption: "Contrato",
          filename: "contrato.pdf"
        }
      }
    );
  });

  it("sends normalized audio as a voice message", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        messages: [{ id: "wamid.audio" }]
      })
    });

    const client = new CloudApiClient(
      {
        accessToken: "test-token",
        phoneNumberId: "629748506897910"
      },
      executor
    );

    await client.sendMedia({
      to: "5511912345678",
      mediaId: "media-audio-1",
      type: "audio",
      voice: true
    });

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/629748506897910/messages",
      "test-token",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "5511912345678",
        type: "audio",
        audio: {
          id: "media-audio-1",
          voice: true
        }
      }
    );
  });

  it("does not add voice=false to regular audio", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        messages: [{ id: "wamid.audio.regular" }]
      })
    });

    const client = new CloudApiClient(
      {
        accessToken: "test-token",
        phoneNumberId: "629748506897910"
      },
      executor
    );

    await client.sendMedia({
      to: "5511912345678",
      mediaId: "media-audio-2",
      type: "audio",
      voice: false
    });

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/629748506897910/messages",
      "test-token",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "5511912345678",
        type: "audio",
        audio: {
          id: "media-audio-2"
        }
      }
    );
  });

  it("rejects media send without media id", async () => {
    const executor = jest.fn();

    const client = new CloudApiClient(
      {
        accessToken: "test-token",
        phoneNumberId: "629748506897910"
      },
      executor
    );

    await expect(
      client.sendMedia({
        to: "5511912345678",
        mediaId: "",
        type: "image"
      })
    ).rejects.toMatchObject({
      message: "ERR_CLOUD_API_MEDIA_ID_REQUIRED"
    });

    expect(executor).not.toHaveBeenCalled();
  });
});