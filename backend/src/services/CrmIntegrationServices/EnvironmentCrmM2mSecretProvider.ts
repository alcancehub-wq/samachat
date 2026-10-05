import { CrmM2mSecretResolver } from "./CrmM2mSecretResolver";

export const CRM_M2M_SECRET_REFERENCE =
  "env:SAMACHAT_CRM_M2M_HMAC_SECRET";

export default class EnvironmentCrmM2mSecretProvider
  implements CrmM2mSecretResolver
{
  async resolve(secretReference: string): Promise<Uint8Array> {
    if (secretReference !== CRM_M2M_SECRET_REFERENCE) {
      throw new Error("CRM_M2M_SECRET_REFERENCE_UNSUPPORTED");
    }
    const secret = process.env.SAMACHAT_CRM_M2M_HMAC_SECRET;
    if (!secret) throw new Error("CRM_M2M_SECRET_UNCONFIGURED");
    return Buffer.from(secret, "utf8");
  }
}
