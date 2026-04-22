$ErrorActionPreference = "Stop"

$base = "http://localhost:8080"
$adminEmail = "admin@whaticket.com"
$adminPass = "admin"

function Get-AdminHeaders {
    $login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body (ConvertTo-Json @{ email = $adminEmail; password = $adminPass })
    return @{ Authorization = "Bearer $($login.token)" }
}

$headers = Get-AdminHeaders
Write-Host "Auth: OK"

# Informativos
$informative = Invoke-RestMethod -Method Post -Uri "$base/informatives" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ title = "Aviso de teste"; content = "Conteudo do informativo"; isActive = $true; audience = "all" })
$informativeId = $informative.id
Write-Host "Informative create: OK"
Invoke-RestMethod -Method Put -Uri "$base/informatives/$informativeId" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ isActive = $false }) | Out-Null
Write-Host "Informative update: OK"
Invoke-RestMethod -Method Get -Uri "$base/informatives" -Headers $headers | Out-Null
Write-Host "Informative list: OK"
Invoke-RestMethod -Method Delete -Uri "$base/informatives/$informativeId" -Headers $headers | Out-Null
Write-Host "Informative delete: OK"

# Kanban
Invoke-RestMethod -Method Get -Uri "$base/admin/kanban" -Headers $headers | Out-Null
Write-Host "Kanban board: OK"
Invoke-RestMethod -Method Get -Uri "$base/admin/kanban/columns" -Headers $headers | Out-Null
Write-Host "Kanban columns: OK"

# Tasks
$task = Invoke-RestMethod -Method Post -Uri "$base/admin/tasks" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ title = "Tarefa smoke"; description = "Teste" })
$taskId = $task.data.id
Write-Host "Task create: OK"
Invoke-RestMethod -Method Put -Uri "$base/admin/tasks/$taskId" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ title = "Tarefa atualizada" }) | Out-Null
Write-Host "Task update: OK"
Invoke-RestMethod -Method Put -Uri "$base/admin/tasks/$taskId/close" -Headers $headers | Out-Null
Write-Host "Task close: OK"
Invoke-RestMethod -Method Put -Uri "$base/admin/tasks/$taskId/reopen" -Headers $headers | Out-Null
Write-Host "Task reopen: OK"
Invoke-RestMethod -Method Delete -Uri "$base/admin/tasks/$taskId" -Headers $headers | Out-Null
Write-Host "Task delete: OK"

# Files
Invoke-RestMethod -Method Get -Uri "$base/admin/files" -Headers $headers | Out-Null
Write-Host "Files list: OK"

# Schedules
$scheduledAt = (Get-Date).AddHours(1).ToString("s")
$schedule = Invoke-RestMethod -Method Post -Uri "$base/schedules" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ body = "Agendamento teste"; status = "pending"; scheduledAt = $scheduledAt })
$scheduleId = $schedule.id
Write-Host "Schedule create: OK"
Invoke-RestMethod -Method Put -Uri "$base/schedules/$scheduleId" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ body = "Agendamento atualizado" }) | Out-Null
Write-Host "Schedule update: OK"
Invoke-RestMethod -Method Put -Uri "$base/schedules/$scheduleId/cancel" -Headers $headers | Out-Null
Write-Host "Schedule cancel: OK"
Invoke-RestMethod -Method Get -Uri "$base/schedules/$scheduleId" -Headers $headers | Out-Null
Write-Host "Schedule show: OK"

# Flows
$flow = Invoke-RestMethod -Method Post -Uri "$base/flows" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ name = "Flow smoke"; description = "Teste"; isActive = $true })
$flowId = $flow.id
Write-Host "Flow create: OK"
$graphPayload = @{ nodes = @(@{ id = -1; type = "start"; name = "Inicio"; data = @{}; positionX = 0; positionY = 0 }, @{ id = -2; type = "end"; name = "Fim"; data = @{}; positionX = 200; positionY = 0 }); edges = @(@{ id = -1; sourceNodeId = -1; targetNodeId = -2; conditionType = "always"; conditionValue = ""; priority = 0 }); triggers = @(@{ id = -1; type = "always"; value = ""; isActive = $true }) }
Invoke-RestMethod -Method Put -Uri "$base/flows/$flowId/graph" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json $graphPayload -Depth 6) | Out-Null
Write-Host "Flow graph save: OK"
Invoke-RestMethod -Method Put -Uri "$base/flows/$flowId/publish" -Headers $headers | Out-Null
Write-Host "Flow publish: OK"
Invoke-RestMethod -Method Post -Uri "$base/flows/$flowId/test" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ input = "test"; tags = @(); queueId = $null }) | Out-Null
Write-Host "Flow test: OK"
Invoke-RestMethod -Method Put -Uri "$base/flows/$flowId/unpublish" -Headers $headers | Out-Null
Write-Host "Flow unpublish: OK"

# Campaigns
$campaign = Invoke-RestMethod -Method Post -Uri "$base/campaigns" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ name = "Campanha smoke"; description = "Teste"; status = "draft"; scheduledAt = $null })
$campaignId = $campaign.id
Write-Host "Campaign create: OK"
Invoke-RestMethod -Method Put -Uri "$base/campaigns/$campaignId" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ status = "scheduled"; scheduledAt = $scheduledAt }) | Out-Null
Write-Host "Campaign schedule: OK"
Invoke-RestMethod -Method Delete -Uri "$base/campaigns/$campaignId" -Headers $headers | Out-Null
Write-Host "Campaign delete: OK"

# Integrations + Webhooks
$integrationName = "Integracao smoke $(Get-Date -Format 'yyyyMMddHHmmss')"
$integration = Invoke-RestMethod -Method Post -Uri "$base/integrations" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ name = $integrationName; type = "custom"; description = "Teste"; isActive = $true })
$integrationId = $integration.id
Write-Host "Integration create: OK"
$webhook = Invoke-RestMethod -Method Post -Uri "$base/webhooks" -Headers $headers -ContentType "application/json" -Body (ConvertTo-Json @{ name = "Webhook smoke"; url = "https://example.com/webhook"; method = "POST"; events = @("webhook.created"); integrationId = $integrationId; isActive = $true })
$webhookId = $webhook.id
Write-Host "Webhook create: OK"
try {
    Invoke-RestMethod -Method Post -Uri "$base/webhooks/$webhookId/test" -Headers $headers | Out-Null
    Write-Host "Webhook test: OK"
} catch {
    Write-Host "Webhook test: FAIL (expected if endpoint unreachable)"
}
Invoke-RestMethod -Method Delete -Uri "$base/webhooks/$webhookId" -Headers $headers | Out-Null
Write-Host "Webhook delete: OK"
Invoke-RestMethod -Method Delete -Uri "$base/integrations/$integrationId" -Headers $headers | Out-Null
Write-Host "Integration delete: OK"

# OpenAI
Invoke-RestMethod -Method Get -Uri "$base/openai/settings" -Headers $headers | Out-Null
Write-Host "OpenAI settings get: OK"
try {
    Invoke-RestMethod -Method Post -Uri "$base/openai/settings/test" -Headers $headers | Out-Null
    Write-Host "OpenAI test: OK"
} catch {
    $msg = $_.ErrorDetails.Message
    if ($msg) {
        Write-Host "OpenAI test: FAIL ($msg)"
    } else {
        Write-Host "OpenAI test: FAIL"
    }
}

Write-Host "Smoke test done"
