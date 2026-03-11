export type AutomationTriggerType =
  | 'message_received'
  | 'conversation_created'
  | 'crm_deal_created';

export type AutomationActionType =
  | 'send_message'
  | 'create_crm_deal'
  | 'call_webhook';

export interface AutomationActionInput {
  action_type: AutomationActionType;
  payload: Record<string, unknown>;
}

export interface AutomationInput {
  name: string;
  trigger_type: AutomationTriggerType;
  is_active?: boolean;
  actions: AutomationActionInput[];
}
