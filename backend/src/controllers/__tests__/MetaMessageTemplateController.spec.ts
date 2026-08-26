import { Request, Response } from "express";
import * as MetaMessageTemplateController from "../MetaMessageTemplateController";
import ShowUserService from "../../services/UserServices/ShowUserService";
import AuthorizeMetaMessageTemplateConnectionService from "../../services/MetaMessageTemplateServices/AuthorizeMetaMessageTemplateConnectionService";
import ListMetaMessageTemplatesService from "../../services/MetaMessageTemplateServices/ListMetaMessageTemplatesService";
import LoadMetaMessageTemplateConnectionService from "../../services/MetaMessageTemplateServices/LoadMetaMessageTemplateConnectionService";

jest.mock("../../services/UserServices/ShowUserService");
jest.mock("../../services/MetaMessageTemplateServices/AuthorizeMetaMessageTemplateConnectionService");
jest.mock("../../services/MetaMessageTemplateServices/ListMetaMessageTemplatesService");
jest.mock("../../services/MetaMessageTemplateServices/LoadMetaMessageTemplateConnectionService");

const mockShowUser =
  ShowUserService as jest.MockedFunction<typeof ShowUserService>;
const mockAuthorize =
  AuthorizeMetaMessageTemplateConnectionService as jest.MockedFunction<
    typeof AuthorizeMetaMessageTemplateConnectionService
  >;
const mockList =
  ListMetaMessageTemplatesService as jest.MockedFunction<
    typeof ListMetaMessageTemplatesService
  >;
const mockLoadConnection =
  LoadMetaMessageTemplateConnectionService as jest.MockedFunction<
    typeof LoadMetaMessageTemplateConnectionService
  >;

const buildResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn(() => res) as any;
  res.json = jest.fn(() => res) as any;
  return res;
};

describe("MetaMessageTemplateController.index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses authenticated user sectors and requested connection", async () => {
    const user = {
      id: 9,
      queues: [{ id: 10 }, { id: 20 }]
    } as any;
    const connection = {
      providerType: "official",
      queus: []
    } as any;
    const templates = {
      data: [{ id: "tpl1" }]
    } as any;

    mockShowUser.mockResolvedValue(user);
    mockLoadConnection.mockResolvedValue(connection);
    mockList.mockResolvedValue(templates);

    const req = {
      params: { whatsappId: "35" },
      user: { id: "9", profile: "user" }
    } as unknown as Request;
    const res = buildResponse();

    await MetaMessageTemplateController.index(req, res);

    expect(mockShowUser).toHaveBeenCalledWith("9");
    expect(mockLoadConnection).toHaveBeenCalledWith("35");
    expect(mockAuthorize).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "user",
        permission: "metaTemplates.view",
        userQueueIds: [10, 20],
        connection
      })
    );
    expect(mockList).toHaveBeenCalledTimes(1);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(200);
    expect((res.json as jest.Mock)).toHaveBeenCalledWith(templates);
  });

  it("does not list templates if authorization fails", async () => {
    const connection = {
      providerType: "official",
      queues: []
    } as any;

    mockShowUser.mockResolvedValue({
      queues: [{ id: 10 }]
    } as any);
    mockLoadConnection.mockResolvedValue(connection);
    mockAuthorize.mockImplementation(() => {
      throw {
        message: "ERR_NO_PERMISSION",
        statusCode: 403
      };
    });

    const req = {
      params: { whatsappId: "35" },
      user: { id: "9", profile: "user" }
    } as unknown as Request;
    const res = buildResponse();

    await expect(
      MetaMessageTemplateController.index(req, res)
    ).rejects.toMatchObject({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    });

    expect(mockList).not.toHaveBeenCalled();
  });
});
