import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import ListCampaignsService from "../services/CampaignServices/ListCampaignsService";
import CreateCampaignService from "../services/CampaignServices/CreateCampaignService";
import ShowCampaignService from "../services/CampaignServices/ShowCampaignService";
import UpdateCampaignService from "../services/CampaignServices/UpdateCampaignService";
import DeleteCampaignService from "../services/CampaignServices/DeleteCampaignService";
import { parseCampaignTagIds } from "../services/CampaignServices/campaignTags";


import {
  CampaignStatus,
  campaignStatuses
} from "../services/CampaignServices/campaignStatus";


type IndexQuery = {
  searchParam?: string;
};

interface CampaignData {
  name: string;
  description?: string;
  dialogId?: number | null;
  contactListId?: number | null;
  tagIds?: number[];
  status?: CampaignStatus;
  scheduledAt?: string | null;
  reviewedAt?: string | null;
}

const serializeCampaign = (campaign: any) => {
  const data = typeof campaign?.toJSON === "function" ? campaign.toJSON() : campaign;

  return {
    ...data,
    tagIds: parseCampaignTagIds(campaign?.tagIds)
  };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam } = req.query as IndexQuery;

  const campaigns = await ListCampaignsService({ searchParam });
  return res.json(campaigns.map(serializeCampaign));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newCampaign: CampaignData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    description: Yup.string(),
    dialogId: Yup.number().nullable(),
    contactListId: Yup.number().nullable(),
    tagIds: Yup.array().of(Yup.number()),
    status: Yup.string().oneOf([...campaignStatuses]),
    scheduledAt: Yup.string().nullable(),
    reviewedAt: Yup.string().nullable()
  });

  try {
    await schema.validate(newCampaign);
  } catch (err) {
    throw new AppError(err.message);
  }

  const createdCampaign = await CreateCampaignService({
    ...newCampaign,
    tagIds: newCampaign.tagIds || []
  });

  const campaign = await ShowCampaignService(createdCampaign.id);
  const serializedCampaign = serializeCampaign(campaign);

  const io = getIO();
  io.emit("campaign", {
    action: "create",
    campaign: serializedCampaign
  });

  return res.status(200).json(serializedCampaign);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;

  const campaign = await ShowCampaignService(campaignId);
  return res.status(200).json(serializeCampaign(campaign));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const campaignData: CampaignData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string(),
    description: Yup.string(),
    dialogId: Yup.number().nullable(),
    contactListId: Yup.number().nullable(),
    tagIds: Yup.array().of(Yup.number()),
    status: Yup.string().oneOf([...campaignStatuses]),
    scheduledAt: Yup.string().nullable(),
    reviewedAt: Yup.string().nullable()
  });

  try {
    await schema.validate(campaignData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { campaignId } = req.params;

  const updatedCampaign = await UpdateCampaignService({
    campaignId,
    campaignData
  });

  const campaign = await ShowCampaignService(updatedCampaign.id);
  const serializedCampaign = serializeCampaign(campaign);

  const io = getIO();
  io.emit("campaign", {
    action: "update",
    campaign: serializedCampaign
  });

  return res.status(200).json(serializedCampaign);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;

  await DeleteCampaignService(campaignId);

  const io = getIO();
  io.emit("campaign", {
    action: "delete",
    campaignId
  });

  return res.status(200).json({ message: "Campaign deleted" });
};
