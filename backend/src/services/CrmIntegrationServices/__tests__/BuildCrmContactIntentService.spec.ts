import BuildCrmContactIntentService, {
  CrmContactIntentInput,
  CrmContactIntentDecision
} from "../BuildCrmContactIntentService";

const makeInput = (): CrmContactIntentInput => ({
  contact: {
    id: 1,
    isGroup: false,
    name: "Synthetic Contact",
    number: "12025550123",
    phoneE164: "+12025550123",
    captureChannel: "WhatsApp",
    wasReferred: false,
    lid: "synthetic-lid@lid"
  },
  resolution: "created",
  bindingStatus: "unknown",
  context: {
    channel: "whatsapp_inbound",
    provenance: "realtime",
    fromMe: false,
    isGroup: false,
    authorized: true
  }
});

const expectRestricted = (decision: CrmContactIntentDecision): void => {
  expect(decision.transport).toBe("not_released");
  expect(decision.commercialOperation).toBe("not_requested");
  expect(decision.m2mContract).toBe("PENDENTE_DE_VALIDACAO_CRM");
  expect(JSON.stringify(decision)).not.toMatch(
    /event_id|source_revision|receipt_id|opportunity_id|primary_deal_id|occurred_at/
  );
};

describe("BuildCrmContactIntentService", () => {
  it("builds only a contact candidate for a resolved new individual inbound contact", () => {
    const result = BuildCrmContactIntentService(makeInput());

    expect(result).toMatchObject({
      status: "candidate",
      reason: "contact_created",
      candidate: {
        operation: "upsert_contact",
        source_contact_id: "1",
        change: "created",
        data: {
          phone_e164: "+12025550123",
          display_name: "Synthetic Contact",
          capture_channel: "WhatsApp",
          registration: { complete: true, missingFields: [] }
        }
      }
    });
    expectRestricted(result);
  });

  it.each(["linked", "unknown"] as const)(
    "does nothing for unchanged existing contact with %s binding",
    bindingStatus => {
      const input = makeInput();
      const result = BuildCrmContactIntentService({
        ...input,
        resolution: "reused",
        bindingStatus,
        previousContact: input.contact
      });

      expect(result).toMatchObject({
        status: "no_action",
        reason: "no_semantic_change"
      });
      expectRestricted(result);
    }
  );

  it("does not infer enrichment from reuse without a previous snapshot", () => {
    expect(
      BuildCrmContactIntentService({
        ...makeInput(),
        resolution: "reused",
        bindingStatus: "linked"
      })
    ).toMatchObject({ status: "no_action", reason: "no_semantic_change" });
  });

  it("builds initial synchronization for an existing contact with proven missing binding", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        resolution: "reused",
        bindingStatus: "not_linked",
        previousContact: input.contact
      })
    ).toMatchObject({
      status: "candidate",
      reason: "initial_sync_required",
      candidate: { change: "reused" }
    });
  });

  it.each(["reused", "enriched"] as const)(
    "recognizes proven name enrichment for %s resolution",
    resolution => {
      const input = makeInput();
      expect(
        BuildCrmContactIntentService({
          ...input,
          resolution,
          previousContact: { ...input.contact, name: null }
        })
      ).toMatchObject({
        status: "candidate",
        reason: "semantic_enrichment",
        candidate: { change: "enriched" }
      });
    }
  );

  it("does not trust an enrichment label without a previous snapshot", () => {
    expect(
      BuildCrmContactIntentService({ ...makeInput(), resolution: "enriched" })
    ).toMatchObject({ status: "no_action", reason: "change_unverified" });
  });

  it("does not create an intent for an enrichment label with unchanged data", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        resolution: "enriched",
        previousContact: input.contact
      })
    ).toMatchObject({ status: "no_action", reason: "no_semantic_change" });
  });

  it("preserves incomplete registration without inventing name or referral decisions", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        contact: {
          ...input.contact,
          name: null,
          captureChannel: null,
          wasReferred: null
        }
      })
    ).toMatchObject({
      status: "candidate",
      candidate: {
        data: {
          display_name: null,
          capture_channel: null,
          registration: {
            complete: false,
            missingFields: ["name", "captureChannel", "wasReferred"]
          }
        }
      }
    });
  });

  it("keeps LID-only identity pending without converting it to a phone", () => {
    const input = makeInput();
    const result = BuildCrmContactIntentService({
      ...input,
      contact: { ...input.contact, number: null, phoneE164: null }
    });
    expect(result).toMatchObject({
      status: "pending_identity",
      reason: "lid_without_resolved_phone",
      source_contact_id: "1"
    });
    expect(result).not.toHaveProperty("candidate");
    expectRestricted(result);
  });

  it("retains identity when no phone or LID was resolved", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        contact: { ...input.contact, number: null, phoneE164: null, lid: null }
      })
    ).toMatchObject({
      status: "pending_identity",
      reason: "phone_not_resolved",
      source_contact_id: "1"
    });
  });

  it("recognizes later phone enrichment of the same LID-only contact", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        resolution: "enriched",
        previousContact: { ...input.contact, number: null, phoneE164: null }
      })
    ).toMatchObject({
      status: "candidate",
      candidate: { source_contact_id: "1", change: "enriched" }
    });
  });

  it("accepts an explicitly resolved normalized international number without assuming Brazil", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        contact: {
          ...input.contact,
          number: "+12025550123",
          phoneE164: " +12025550123 "
        }
      })
    ).toMatchObject({
      status: "candidate",
      candidate: { data: { phone_e164: "+12025550123" } }
    });
  });

  it("allows explicitly authorized manual contact synchronization without commercial admission", () => {
    const input = makeInput();
    const result = BuildCrmContactIntentService({
      ...input,
      context: { ...input.context, channel: "manual", provenance: "manual" }
    });
    expect(result.status).toBe("candidate");
    expectRestricted(result);
  });

  it.each(["manual", "whatsapp_inbound"] as const)(
    "rejects unauthorized %s synchronization",
    channel => {
      const input = makeInput();
      expect(
        BuildCrmContactIntentService({
          ...input,
          context: {
            ...input.context,
            channel,
            provenance: channel === "manual" ? "manual" : "realtime",
            authorized: false
          }
        })
      ).toMatchObject({
        status: "no_action",
        reason:
          channel === "manual" ? "manual_not_authorized" : "sync_not_authorized"
      });
    }
  );

  it.each(["contact", "context"])(
    "ignores a group identified by %s",
    origin => {
      const input = makeInput();
      const result = BuildCrmContactIntentService({
        ...input,
        contact: { ...input.contact, isGroup: origin === "contact" },
        context: { ...input.context, isGroup: origin === "context" }
      });
      expect(result).toMatchObject({ status: "no_action", reason: "group" });
      expectRestricted(result);
    }
  );

  it.each(["fromMe", "api_outbound"])("ignores outbound through %s", origin => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        context: {
          ...input.context,
          fromMe: origin === "fromMe",
          channel:
            origin === "api_outbound" ? "api_outbound" : "whatsapp_inbound"
        }
      })
    ).toMatchObject({ status: "no_action", reason: "outbound" });
  });

  it.each(["echo", "history", "ack", "unknown"] as const)(
    "ignores %s provenance",
    provenance => {
      const input = makeInput();
      const result = BuildCrmContactIntentService({
        ...input,
        context: { ...input.context, provenance }
      });
      expect(result).toMatchObject({
        status: "no_action",
        reason: provenance === "unknown" ? "unknown_provenance" : provenance
      });
      expectRestricted(result);
    }
  );

  it.each(["reconciliation", "unknown"] as const)(
    "does not infer realtime eligibility for %s channel",
    channel => {
      const input = makeInput();
      expect(
        BuildCrmContactIntentService({
          ...input,
          context: { ...input.context, channel }
        })
      ).toMatchObject({ status: "no_action", reason: "unknown_provenance" });
    }
  );

  it("rejects manual channel falsely paired with realtime provenance", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        context: { ...input.context, channel: "manual" }
      })
    ).toMatchObject({ status: "no_action", reason: "unknown_provenance" });
  });

  it.each([
    null,
    {},
    { id: 0 },
    { id: -1 },
    { id: Number.MAX_SAFE_INTEGER + 1 },
    { id: "1" },
    { name: 7 },
    { isGroup: undefined },
    { wasReferred: "false" }
  ])("fails closed for absent or invalid contact %j", invalid => {
    const input = makeInput();
    const contact =
      invalid === null || Object.keys(invalid).length === 0
        ? invalid
        : { ...input.contact, ...invalid };
    expect(
      BuildCrmContactIntentService({
        ...input,
        contact
      } as unknown as CrmContactIntentInput)
    ).toMatchObject({ status: "no_action", reason: "invalid_contact" });
  });

  it.each([
    null,
    { authorized: undefined },
    { fromMe: undefined },
    { isGroup: undefined },
    { authorized: "true" }
  ])("fails closed for absent or invalid context %j", invalid => {
    const input = makeInput();
    const context = invalid === null ? null : { ...input.context, ...invalid };
    expect(
      BuildCrmContactIntentService({
        ...input,
        context
      } as unknown as CrmContactIntentInput)
    ).toMatchObject({ status: "no_action", reason: "invalid_context" });
  });

  it.each([
    { resolution: "merged" },
    { resolution: undefined },
    { bindingStatus: "assumed" }
  ])("rejects unsupported resolution evidence %j", invalid => {
    expect(
      BuildCrmContactIntentService({
        ...makeInput(),
        ...invalid
      } as unknown as CrmContactIntentInput)
    ).toMatchObject({ status: "no_action", reason: "invalid_resolution" });
  });

  it.each([{ id: 2 }, { isGroup: true }])(
    "rejects unrelated previous identity %j",
    invalid => {
      const input = makeInput();
      expect(
        BuildCrmContactIntentService({
          ...input,
          resolution: "enriched",
          previousContact: { ...input.contact, ...invalid }
        })
      ).toMatchObject({
        status: "no_action",
        reason: "invalid_previous_contact"
      });
    }
  );

  it("rejects contradictory creation and previous-contact evidence", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({ ...input, previousContact: input.contact })
    ).toMatchObject({
      status: "no_action",
      reason: "contradictory_resolution"
    });
  });

  it.each([
    { phoneE164: null },
    { phoneE164: "12025550123" },
    { phoneE164: "+012025550123" },
    { phoneE164: "+123" },
    { phoneE164: "+1234567890123456" },
    { phoneE164: "synthetic-lid@lid" },
    { phoneE164: "+12025550124" },
    { number: null },
    { number: "synthetic-lid@lid" }
  ])("does not confirm unresolved or inconsistent phone %j", invalid => {
    const input = makeInput();
    const result = BuildCrmContactIntentService({
      ...input,
      contact: { ...input.contact, ...invalid }
    });
    expect(result.status).toBe("pending_identity");
    expect(result).not.toHaveProperty("candidate");
    expectRestricted(result);
  });

  it("ignores whitespace-only changes after semantic projection", () => {
    const input = makeInput();
    expect(
      BuildCrmContactIntentService({
        ...input,
        resolution: "reused",
        bindingStatus: "linked",
        previousContact: {
          ...input.contact,
          name: " Synthetic Contact ",
          captureChannel: " WhatsApp "
        }
      })
    ).toMatchObject({ status: "no_action", reason: "no_semantic_change" });
  });

  it("does not treat messages, updatedAt, photo or tags as cadastral enrichment", () => {
    const input = makeInput();
    const contact = {
      ...input.contact,
      updatedAt: "2030-01-01",
      profilePicUrl: "https://example.invalid/photo",
      tags: ["synthetic"],
      unreadMessages: 2
    };
    expect(
      BuildCrmContactIntentService({
        ...input,
        contact,
        resolution: "reused",
        previousContact: input.contact
      })
    ).toMatchObject({ status: "no_action", reason: "no_semantic_change" });
  });

  it("projects only minimal permitted contact data, never the full contact or LID", () => {
    const input = makeInput();
    const contact = {
      ...input.contact,
      email: "synthetic@example.invalid",
      city: "Synthetic City",
      extraInfo: [{ value: "private" }],
      secret: "synthetic-not-a-credential"
    };
    const result = BuildCrmContactIntentService({ ...input, contact });
    if (result.status !== "candidate") throw new Error("Expected candidate");
    expect(Object.keys(result.candidate.data)).toEqual([
      "phone_e164",
      "display_name",
      "capture_channel",
      "registration"
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /extraInfo|synthetic@example|Synthetic City|private|secret|synthetic-lid/
    );
    expectRestricted(result);
  });

  it("is deterministic and does not mutate frozen input or read implicit clocks/randomness", () => {
    const input = makeInput();
    Object.freeze(input.contact);
    Object.freeze(input.context);
    Object.freeze(input);
    const before = JSON.stringify(input);
    const clock = jest.spyOn(Date, "now");
    const random = jest.spyOn(Math, "random");
    try {
      const first = BuildCrmContactIntentService(input);
      const second = BuildCrmContactIntentService(input);
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(JSON.stringify(input)).toBe(before);
      expect(clock).not.toHaveBeenCalled();
      expect(random).not.toHaveBeenCalled();
    } finally {
      clock.mockRestore();
      random.mockRestore();
    }
  });

  it("returns independent registration results on successive calls", () => {
    const input = makeInput();
    const first = BuildCrmContactIntentService(input);
    if (first.status !== "candidate") throw new Error("Expected candidate");
    first.candidate.data.registration.missingFields.push("name");
    const second = BuildCrmContactIntentService(input);
    expect(second).toMatchObject({
      candidate: {
        data: { registration: { complete: true, missingFields: [] } }
      }
    });
  });
});
