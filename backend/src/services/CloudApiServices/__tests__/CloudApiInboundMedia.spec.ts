import CloudApiClient, {
  buildCloudApiMediaMetadataUrl
} from "../CloudApiClient";

describe("CloudApiClient inbound media", () => {
  it("builds media metadata url", () => {
    expect(
      buildCloudApiMediaMetadataUrl(
        "media-123",
        "629748506897910",
        "v20.0"
      )
    ).toBe(
      "https://graph.facebook.com/v20.0/media-123?phone_number_id=629748506897910"
    );
  });

  it("retrieves media metadata using bearer token", async () => {
    const postExecutor = jest.fn();

    const getExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: Buffer.from(JSON.stringify({
        url: "https://lookaside.fbsbx.com/test-media",
        mime_type: "audio/ogg",
        id: "media-123"
      })),
      contentType: "application/json"
    });

    const client = new CloudApiClient(
      {
        accessToken: "token",
        phoneNumberId: "629748506897910",
        apiVersion: "v20.0"
      },
      postExecutor,
      getExecutor
    );

    const result = await client.retrieveMedia("media-123");

    expect(getExecutor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/media-123?phone_number_id=629748506897910",
      "token"
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: "media-123",
        mime_type: "audio/ogg",
        url: "https://lookaside.fbsbx.com/test-media"
      })
    );

    expect(postExecutor).not.toHaveBeenCalled();
  });

  it("downloads binary media using bearer token", async () => {
    const postExecutor = jest.fn();

    const getExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: Buffer.from("audio-binary"),
      contentType: "audio/ogg; codecs=opus"
    });

    const client = new CloudApiClient(
      {
        accessToken: "token",
        phoneNumberId: "629748506897910"
      },
      postExecutor,
      getExecutor
    );

    const result = await client.downloadMedia(
      "https://lookaside.fbsbx.com/test-media"
    );

    expect(getExecutor).toHaveBeenCalledWith(
      "https://lookaside.fbsbx.com/test-media",
      "token"
    );

    expect(result.data).toEqual(
      Buffer.from("audio-binary")
    );

    expect(result.mimetype).toBe("audio/ogg");
  });

  it("rejects empty media id", async () => {
    const client = new CloudApiClient({
      accessToken: "token",
      phoneNumberId: "629748506897910"
    });

    await expect(
      client.retrieveMedia("")
    ).rejects.toMatchObject({
      message: "ERR_CLOUD_API_MEDIA_ID_REQUIRED"
    });
  });

  it("rejects empty download url", async () => {
    const client = new CloudApiClient({
      accessToken: "token",
      phoneNumberId: "629748506897910"
    });

    await expect(
      client.downloadMedia("")
    ).rejects.toMatchObject({
      message: "ERR_CLOUD_API_MEDIA_URL_REQUIRED"
    });
  });

  it("rejects non https download url", async () => {
    const client = new CloudApiClient({
      accessToken: "token",
      phoneNumberId: "629748506897910"
    });

    await expect(
      client.downloadMedia("http://example.com/file")
    ).rejects.toMatchObject({
      message: "ERR_CLOUD_API_MEDIA_URL_INVALID"
    });
  });
});