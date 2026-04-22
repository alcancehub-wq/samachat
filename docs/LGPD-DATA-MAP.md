# LGPD - Mapa de Dados

## Dados coletados
- Conta: email, nome, avatar (UserProfile)
- Tenancy: tenant_id, memberships, roles
- Mensagens e conversas (Message/Conversation)
- Metadados tecnicos: IP, user agent (LegalAcceptance)
- Convites: email e token de acesso
- Futuro: billing e dados de pagamento

## Finalidades
- Operacao e autenticacao do produto
- Automacoes e suporte ao cliente
- Seguranca, auditoria e conformidade
- Analise de uso e melhoria do produto

## Base legal
- Execucao de contrato
- Consentimento (termos/privacidade)
- Interesse legitimo (seguranca e auditoria)

## Retencao e delecao
- Mensagens: conforme politica do tenant (DataRetentionPolicy)
- Auditoria: retenção maior para seguranca
- Exclusao sob solicitacao do titular

## Direitos do titular
- Acesso, correcao, portabilidade e exclusao
- Canal futuro: suporte interno e fluxo automatizado

## Subprocessadores
- Supabase (auth, storage, database)
- Provedores de mensageria (WABA, QR)
