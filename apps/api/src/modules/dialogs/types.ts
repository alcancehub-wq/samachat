export type DialogType = 'message' | 'template' | 'automation';
export type DialogChannel = 'whatsapp';
export type DialogStatus = 'active' | 'inactive';

export interface DialogInput {
  name: string;
  group_name?: string | null;
  type: DialogType;
  channel?: DialogChannel;
  status?: DialogStatus;
  message_text?: string | null;
  media_url?: string | null;
  template_name?: string | null;
  template_id?: string | null;
  template_language?: string | null;
  template_variables?: Record<string, string> | null;
  automation_actions?: Record<string, unknown>[] | null;
}
