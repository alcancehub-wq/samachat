import Whatsapp from "../../../models/Whatsapp";
import LoadMetaMessageTemplateConnectionService from "../LoadMetaMessageTemplateConnectionService";

describe("LoadMetaMessageTemplateConnectionService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads only the Meta template connection fields with queue permissions", async () => {
    const connection = {
      id: 35,
      name: "Official",
      providerType: "official",
      wabaId: "test-waba",
      accessToken: "secret-token",
      apiVersion: "v20.0",
      queues: []
    } as unknown as Whatsapp;

    const findByPk = jest
      .spyOn(Whatsapp, "findByPk")
      .mockResolvedValue(connection);

    const result =
      await LoadMetaMessageTemplateConnectionService(35);

    expect(result).toBe(connection);
    expect(findByPk).toHaveBeenCalledTimes(1);
    expect(findByPk).toHaveBeenCalledWith(
      35,
      expect.objectContaining({
        attributes: [
          "id",
          "name",
          "providerType",
          "wabaId",
          "accessToken",
          "apiVersion"
        ],
        include: [
          expect.objectContaining({
            as: "queues",
            attributes: ["id", "name"],
            include: [
              expect.objectContaining({
                attributes: ["permissions"]
              })
            ]
          })
        ]
      })
    );
  });

  it("accepts string connection ids without rewriting them", async () => {
    const connection = {
      id: 35,
      providerType: "official",
      queues: []
    } as unknown as Whatsapp;

    const findByPk = jest
      .spyOn(Whatsapp, "findByPk")
      .mockResolvedValue(connection);

    await LoadMetaMessageTemplateConnectionService("35");

    expect(findByPk).toHaveBeenCalledWith(
      "35",
      expect.any(Object)
    );
  });

  it("returns 404 when the connection does not exist", async () => {
    jest
      .spyOn(Whatsapp, "findByPk")
      .mockResolvedValue(null as unknown as Whatsapp);

    await expect(
      LoadMetaMessageTemplateConnectionService(999)
    ).rejects.toMatchObject({
      message: "ERR_NO_WAPP_FOUND",
      statusCode: 404
    });
  });
});
