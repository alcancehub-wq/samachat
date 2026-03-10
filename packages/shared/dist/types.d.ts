export type Role = 'admin' | 'manager' | 'agent';
export type ConversationStatus = 'open' | 'waiting' | 'active' | 'closed';
export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved';
export type LegalDocumentType = 'terms' | 'privacy';
export type DataRequestType = 'export' | 'delete';
export type DataRequestStatus = 'requested' | 'in_review' | 'completed' | 'rejected';
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface UserProfile {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    created_at: string;
    updated_at: string;
}
export interface Membership {
    id: string;
    tenant_id: string;
    user_id: string;
    role: Role;
    created_at: string;
    updated_at: string;
}
export interface Invite {
    id: string;
    tenant_id: string;
    email: string;
    role: Role;
    token: string;
    expires_at: string;
    accepted_at?: string | null;
    created_at: string;
    created_by_user_id?: string | null;
}
export interface Conversation {
    id: string;
    tenant_id: string;
    status: ConversationStatus;
    subject?: string | null;
    created_at: string;
    updated_at: string;
}
export interface LegalDocument {
    id: string;
    tenant_id: string;
    type: LegalDocumentType;
    version: string;
    content: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface LegalAcceptance {
    id: string;
    tenant_id: string;
    user_id: string;
    terms_version: string;
    privacy_version: string;
    accepted_at: string;
    ip_address?: string | null;
    user_agent?: string | null;
}
export interface UserConsent {
    id: string;
    tenant_id: string;
    user_id: string;
    document_id: string;
    accepted_at: string;
    ip_address?: string | null;
    user_agent?: string | null;
}
export interface UserPreference {
    id: string;
    tenant_id: string;
    user_id: string;
    theme?: string | null;
    notifications_enabled: boolean;
    created_at: string;
    updated_at: string;
}
export interface DataRequest {
    id: string;
    tenant_id: string;
    user_id: string;
    type: DataRequestType;
    status: DataRequestStatus;
    details?: Record<string, unknown> | null;
    requested_at: string;
    resolved_at?: string | null;
}
export interface DataRetentionPolicy {
    id: string;
    tenant_id: string;
    message_retention_days: number;
    audit_retention_days: number;
    created_at: string;
    updated_at: string;
}
export interface StorageAsset {
    id: string;
    provider: string;
    storage_key: string;
    url: string;
    filename?: string | null;
    content_type?: string | null;
    size_bytes?: number | null;
    created_at: string;
}
//# sourceMappingURL=types.d.ts.map