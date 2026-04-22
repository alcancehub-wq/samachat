export interface CreateLeadResult {
  contact_id: string;
  deal_id: string;
  pipeline_id: string;
  already_linked?: boolean;
}

export interface CreateLeadParams {
  tenant_id: string;
  user_id: string;
  conversation_id: string;
}
