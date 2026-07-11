// apps/api/src/providers/geminiSchema.ts
const nullableString = { type: "string", nullable: true };

export const crmRecordResponseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      row_index: { type: "integer" },
      created_at: nullableString,
      name: nullableString,
      email: nullableString,
      country_code: nullableString,
      mobile_without_country_code: nullableString,
      company: nullableString,
      city: nullableString,
      state: nullableString,
      country: nullableString,
      lead_owner: nullableString,
      crm_status: {
        type: "string",
        nullable: true,
        enum: ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"],
      },
      crm_note: nullableString,
      data_source: {
        type: "string",
        nullable: true,
        enum: [
          "leads_on_demand",
          "meridian_tower",
          "eden_park",
          "varah_swamy",
          "sarjapur_plots",
        ],
      },
      possession_time: nullableString,
      description: nullableString,
    },
    required: ["row_index"],
  },
};