export type CampaignTargetSelection =
  | { type: 'all' }
  | { type: 'tagged'; tag_ids: string[] }
  | { type: 'conversations'; conversation_ids: string[] };

export interface CampaignCreateInput {
  name: string;
  message_content: string;
  media_url?: string | null;
  workspace_id: string;
  dialog_id?: string | null;
  targets: CampaignTargetSelection;
  warning_acknowledged?: boolean;
  warning_version?: string;
  start_at: string;
  interval_seconds: number;
}

export interface CampaignProgress {
  total_targets: number;
  sent: number;
  failed: number;
  pending: number;
}
