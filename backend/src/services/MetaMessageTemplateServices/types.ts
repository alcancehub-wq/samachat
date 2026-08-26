export interface MetaMessageTemplateCredentials {
  accessToken?: string | null;
  wabaId?: string | null;
  apiVersion?: string | null;
}

export type MetaMessageTemplateCategory =
  | "MARKETING"
  | "UTILITY"
  | "AUTHENTICATION";

export interface MetaMessageTemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<Record<string, unknown>>;
  example?: Record<string, unknown>;
}

export interface MetaMessageTemplate {
  id?: string;
  name?: string;
  language?: string;
  status?: string;
  category?: MetaMessageTemplateCategory | string;
  components?: MetaMessageTemplateComponent[];
}

export interface MetaMessageTemplateListResponse {
  data?: MetaMessageTemplate[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}
