import IsPlausiblePhoneNumber from "../../../helpers/IsPlausiblePhoneNumber";
import { logger } from "../../../utils/logger";

export interface WWebJsReconciliationContactLike {
  id?: {
    user?: string;
    _serialized?: string;
  };
  name?: string;
  pushname?: string;
  isGroup?: boolean;
  getProfilePicUrl?: () => Promise<string | undefined>;
}

export interface WWebJsReconciliationMessageLike {
  fromMe?: boolean;
  from?: string;
  to?: string;
  author?: string;
  notifyName?: string;
  pushname?: string;
  _data?: {
    from?: string;
    to?: string;
    author?: string;
  };
}

export interface WWebJsReconciliationContactMetadata {
  name?: string;
  number?: string;
  lid?: string;
  profilePicUrl?: string;
  isGroup: boolean;
}

export const normalizeWWebJsReconciliationLid = (
  value?: string | null
): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.includes("@")
    ? value
    : `${value}@lid`;
};

export const buildWWebJsFallbackReconciliationContactMetadata = (
  msg: WWebJsReconciliationMessageLike
): WWebJsReconciliationContactMetadata | null => {
  const message = msg as WWebJsReconciliationMessageLike;

  const candidateIds = [
    msg.fromMe ? msg.to : msg.from,
    message?._data?.from,
    message?._data?.to,
    message?.author,
    message?._data?.author
  ].filter(
    (value): value is string =>
      typeof value === "string" &&
      value.length > 0
  );

  for (const candidateId of candidateIds) {
    const isGroup =
      candidateId.endsWith("@g.us");

    const raw =
      candidateId.split("@")[0];

    const fallbackName =
      message?.notifyName ||
      message?.pushname ||
      raw ||
      candidateId;

    if (isGroup) {
      return {
        name: fallbackName,
        number: raw,
        profilePicUrl: undefined,
        isGroup: true
      };
    }

    if (IsPlausiblePhoneNumber(raw)) {
      return {
        name: fallbackName,
        number: raw,
        profilePicUrl: undefined,
        isGroup: false
      };
    }

    const lid =
      normalizeWWebJsReconciliationLid(
        candidateId
      );

    if (lid) {
      return {
        name: fallbackName,
        number: "",
        lid,
        profilePicUrl: undefined,
        isGroup: false
      };
    }
  }

  return null;
};

const extractWWebJsContactIdentifiers = (
  contact: WWebJsReconciliationContactLike
): {
  number: string;
  lid?: string;
} => {
  const direct =
    contact?.id?.user;

  if (IsPlausiblePhoneNumber(direct)) {
    return {
      number: direct as string
    };
  }

  const serialized =
    contact?.id?._serialized;

  if (serialized) {
    const raw =
      serialized.split("@")[0];

    if (IsPlausiblePhoneNumber(raw)) {
      return {
        number: raw
      };
    }

    const lid =
      normalizeWWebJsReconciliationLid(
        serialized
      );

    if (lid) {
      return {
        number: "",
        lid
      };
    }
  }

  if (direct) {
    return {
      number: "",
      lid:
        normalizeWWebJsReconciliationLid(
          direct
        )
    };
  }

  return {
    number: ""
  };
};

export const mapWWebJsContactToReconciliationMetadata = async (
  contact: WWebJsReconciliationContactLike,
  options: {
    includeProfilePic?: boolean;
  } = {}
): Promise<WWebJsReconciliationContactMetadata> => {

  const {
    number,
    lid
  } =
    extractWWebJsContactIdentifiers(
      contact
    );

  if (!number && !lid) {
    logger.warn(
      {
        contactId:
          contact?.id?._serialized
      },
      "Invalid contact number from WhatsApp payload"
    );

    throw new Error(
      "Invalid contact number from WhatsApp payload"
    );
  }


  let profilePicUrl: string | undefined;

  if (
    options.includeProfilePic &&
    typeof contact.getProfilePicUrl === "function"
  ) {
    try {
      profilePicUrl =
        await contact.getProfilePicUrl();
    } catch (err) {
      logger.warn(
        {
          err,
          contactId:
            contact?.id?._serialized
        },
        "Unable to resolve targeted reconciliation profile picture"
      );
    }
  }

  return {
    name:
      contact.name ||
      contact.pushname ||
      contact.id?.user ||
      "",
    number,
    lid,
    profilePicUrl,
    isGroup:
      Boolean(contact.isGroup)
  };
};