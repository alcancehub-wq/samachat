import {
  ParseCrmM2mCommercialOptions
} from "../CrmM2mCommercialOptionsService";

const organizationId =
  "00000000-0000-4000-8000-000000000001";

describe("CRM M2M commercial option catalog", () => {
  it("accepts human-readable pipelines, stages and eligible owners", () => {
    expect(
      ParseCrmM2mCommercialOptions(
        {
          schema_version: 1,
          organization_id: organizationId,
          pipelines: [
            {
              name: "SDR",
              stages: [
                { name: "NOVO LEAD" },
                { name: "PRIMEIRO CONTATO" }
              ],
              owners: [
                {
                  user_id:
                    "00000000-0000-4000-8000-000000000002",
                  name: "Ju",
                  email: "AGENTESDR@SAMACON.COM.BR"
                }
              ]
            }
          ]
        },
        organizationId
      )
    ).toEqual({
      pipelines: [
        {
          name: "SDR",
          stages: [
            { name: "NOVO LEAD" },
            { name: "PRIMEIRO CONTATO" }
          ],
          owners: [
            {
              name: "Ju",
              email: "agentesdr@samacon.com.br"
            }
          ]
        }
      ]
    });
  });

  it("rejects cross-org and technical malformed catalogs", () => {
    expect(() =>
      ParseCrmM2mCommercialOptions(
        {
          schema_version: 1,
          organization_id:
            "00000000-0000-4000-8000-000000000099",
          pipelines: []
        },
        organizationId
      )
    ).toThrow("CRM_M2M_OPTIONS_INVALID");

    expect(() =>
      ParseCrmM2mCommercialOptions(
        {
          schema_version: 1,
          organization_id: organizationId,
          pipelines: [
            {
              name: "SDR",
              stages: [{ name: "" }],
              owners: []
            }
          ]
        },
        organizationId
      )
    ).toThrow("CRM_M2M_OPTIONS_INVALID");
  });
});
