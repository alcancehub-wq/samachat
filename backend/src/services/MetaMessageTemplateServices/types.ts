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

export interface MetaMessageTemplateDeleteResponse {
  success: boolean;
}
export interface MetaMessageTemplateCreateResponse {
  id?: string;
  status?: string;
  category?: MetaMessageTemplateCategory | string;
}
export interface MetaMessageTemplateListResponse {
  data?: MetaMessageTemplate[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
  };
}

export interface MetaMessageTemplateHttpResponse {
  statusCode: number;
  body: string;
}
