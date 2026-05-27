import ResolveWhatsAppContext from "../../helpers/ResolveWhatsAppContext";
import NormalizeProviderCheckNumber from "../../helpers/NormalizeProviderCheckNumber";
import {
  whatsappProvider,
  ProviderContactLookupResult
} from "../../providers/WhatsApp";

interface BaseRequest {
  userId?: number;
  whatsappId?: number;
}

interface RichRequest extends BaseRequest {
  returnLookupResult: true;
}

interface PlainRequest extends BaseRequest {
  returnLookupResult?: false;
}

export interface CheckContactNumberLookupResult
  extends ProviderContactLookupResult {}

const normalizeLid = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.includes("@") ? value : `${value}@lid`;
};

const normalizeProviderLookup = (
  lookup: ProviderContactLookupResult
): CheckContactNumberLookupResult => {
  const normalizedNumber = NormalizeProviderCheckNumber(lookup.number);
  const normalizedLid = normalizeLid(
    lookup.lid ||
      (lookup.chatId && /@lid$/i.test(lookup.chatId) ? lookup.chatId : undefined) ||
      (lookup.jid && /@lid$/i.test(lookup.jid) ? lookup.jid : undefined) ||
      (lookup.serializedId && /@lid$/i.test(lookup.serializedId)
        ? lookup.serializedId
        : undefined)
  );
  const phoneChatId = normalizedNumber ? `${normalizedNumber}@c.us` : undefined;
  const chatId = normalizedLid || lookup.chatId || lookup.jid || lookup.serializedId || phoneChatId;

  return {
    number: normalizedNumber,
    chatId,
    jid: lookup.jid || chatId,
    lid: normalizedLid,
    serializedId: lookup.serializedId || chatId
  };
};

const buildLegacyLookup = (value: string): CheckContactNumberLookupResult => {
  const normalizedNumber = NormalizeProviderCheckNumber(value);
  const chatId = normalizedNumber ? `${normalizedNumber}@c.us` : undefined;

  return {
    number: normalizedNumber,
    chatId,
    jid: chatId,
    serializedId: value || chatId
  };
};

const resolveProviderLookup = async (
  whatsappId: number,
  number: string
): Promise<CheckContactNumberLookupResult> => {
  if (typeof whatsappProvider.checkNumberLookup === "function") {
    const providerLookup = await whatsappProvider.checkNumberLookup(
      whatsappId,
      number
    );

    return normalizeProviderLookup(providerLookup);
  }

  const validNumber = await whatsappProvider.checkNumber(whatsappId, number);
  return buildLegacyLookup(validNumber);
};

function CheckContactNumber(
  number: string,
  options: RichRequest
): Promise<CheckContactNumberLookupResult>;

function CheckContactNumber(
  number: string,
  options?: PlainRequest
): Promise<string>;

async function CheckContactNumber(
  number: string,
  options: BaseRequest & { returnLookupResult?: boolean } = {}
): Promise<string | CheckContactNumberLookupResult> {
  const { returnLookupResult = false, ...resolveOptions } = options;
  const defaultWhatsapp = await ResolveWhatsAppContext(resolveOptions);
  const lookupResult = await resolveProviderLookup(defaultWhatsapp.id, number);

  if (returnLookupResult) {
    return lookupResult;
  }

  return lookupResult.number;
}

export default CheckContactNumber;
