# P2 Plan

## Varredura inicial (estado atual)
- Prisma ja possui Tenant, UserProfile, Membership, LegalDocument, UserConsent e entidades multi-tenant (tenant_id em conversas, mensagens, flows, campanhas, etc.).
- Auth no API usa Supabase JWT (SupabaseAuthGuard) e exige tenant_id no token hoje.
- Rotas web existentes: /login, /dashboard, /onboarding (stub), /offline, pagina raiz.
- Tenant enforcement nao existe no backend; RbacGuard usa role do token.

## Decisoes
- Reutilizar modelos existentes (Tenant/UserProfile/Membership/LegalDocument/UserConsent) e adicionar:
  - UserProfile.auth_user_id (id do auth)
  - Invite
  - LegalAcceptance (versoes terms/privacy)
  - DataRetentionPolicy
- Implementar TenantContextGuard para resolver tenant ativo (header x-tenant-id ou token) e garantir membership.
- Atualizar RbacGuard para usar role da membership (nao do token).
- API endpoints novos:
  - POST /tenants
  - GET /tenants
  - POST /tenants/:tenantId/invites
  - POST /invites/:token/accept
  - GET /me/memberships
  - GET /me/onboarding-status
  - POST /legal/acceptance
- Web onboarding por etapas:
  - /onboarding/tenant
  - /onboarding/invite
  - /onboarding/legal
  - /onboarding/done
- Guard do dashboard no frontend para redirecionar conforme status.

## Rotas web planejadas
- /onboarding (wizard base)
- /onboarding/tenant (criar/selecionar tenant)
- /onboarding/invite (aceitar convite)
- /onboarding/legal (aceitar termos/privacidade)
- /onboarding/done (redirect)
- /terms, /privacy, /cookies
- /dashboard/settings/team (gestao de membros)

## Observacoes
- Nenhum P0/P1 sera removido; endpoints atuais continuam.
- Env centralizado em packages/config (inclui versoes legais).
