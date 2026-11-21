# 🗺️ Mapa do Código (Jarvis)

Guia rápido de arquitetura para localizar qualquer funcionalidade, rota, serviço ou tabela sem precisar vasculhar arquivos gigantes.

---

## 1. Visão Geral das Pastas

| Pasta / Arquivo | Responsabilidade |
|---|---|
| `src/index.js` | Bootstrap principal, inicialização dos serviços, conexão SQLite, servidor web e clientes Discord |
| `src/ai/` | Núcleo de IA (`orchestrator.js`), adaptadores Gemini (`adapters/`), prompts (`prompts/`) e ferramentas (`tools/`) |
| `src/commands/` | Registro global (`commandRegistry.js`) e Slash Commands por categoria (`admin`, `ai`, `automations`, `community`, `economy`, `infrastructure`, `moderation`, `music`, `reviews`, `social`, `tickets`, `xp`) |
| `src/config/` | Configuração persistente do bot principal (`botConfig.js` → `data/bot_config.json`) |
| `data/` | Banco SQLite (`cell.sqlite`) e configuração JSON do bot principal (`bot_config.json`) |
| `src/database/migrations/` | 37 migrações SQLite incrementais (`001` a `037`) |
| `src/database/repositories/` | Camada de acesso SQL (`economyRepository.js`, `moderationRepository.js`, `backupRepository.js`, etc.) |
| `src/events/` | Listeners do Discord.js (`ready.js`, `messageCreate.js`, `interactionCreate.js`, etc.) |
| `src/handlers/` | Interpretador de comandos por prefixo (`prefixCommandHandler.js`) |
| `src/services/` | Regras de negócio, orquestração Multi-Bot (`multiBotManager.js`), módulos por servidor (`guildModuleService.js`) e API do painel (`webPanelService.js`) |
| `src/utils/` | Utilitários compartilhados: resolver central de contexto (`botContextResolver.js`), ajuda (`helpMenuHelper.js`), presença (`presenceHelper.js`), etc. |
| `src/web/` | Servidor HTTP do painel (`server.js`) e montador do dashboard (`dashboardHtml.js`) |
| `src/web/dashboard/` | Dashboard modular: `index.js`, `parts/` (`head`, `styles`, `layoutStart`, `layoutEnd`), `tabs/` (27 abas isoladas) e `client/` (16 módulos JS numerados `01` a `16`) |
| `scripts/` | Automação de deploy (`safe-push.ps1`) e snapshot determinístico de HTML (`dashboard-snapshot.js` + `fixtures/dashboard-fixture.json`) |

---

## 2. Fluxo de Requisição no Painel Web

Exemplo de ponta a ponta ao salvar uma configuração de módulo no painel:

1. **Aba HTML** em `src/web/dashboard/tabs/<modulo>.js` → usuário edita o campo e clica no botão.
2. **Cliente JS** em `src/web/dashboard/client/*.js` → chama `saveModule('<modulo>', payload)` (ou `authFetch('/api/bot/config...')`), enviando `X-Bot-Id` (`PRIMARY` ou id da instância), `X-Panel-Password: 1598` e `X-CSRF-Token`.
3. **Rota HTTP** em `src/web/server.js`:
   - Módulos por servidor/instância: bloco `moduleMatch` (`/api/guilds/:guildId/modules/:module`, linha ~1138).
   - Config universal (identidade, presença, IA, tema, ajuda): `/api/bot/config` `GET`/`POST` (linhas ~601 e ~670).
   - Ciclo de vida Multi-Bot: `/api/multi-bot` e `/api/multi-bot/:id/*` (linhas ~872–1035).
4. **Serviço do Painel** em `src/services/webPanelService.js` → `getGuildOverview` (linha ~222), `getModuleConfig` (linha ~702) e `updateModuleConfig` (linha ~1064).
5. **Repositório & SQLite** → `src/database/repositories/*` gravando nas tabelas de `data/cell.sqlite` (ou `bot_instance_configs` via `multiBotManager.updateInstance`).

---

## 3. Regra Crítica: PRIMARY vs Instância Multi-Bot

> **Atenção:** Quase todos os bugs corrigidos nas últimas sessões aconteceram por alterar apenas um dos dois ramos abaixo. **Sempre verifique e atualize os dois.**

| Aspecto | Bot Principal (`PRIMARY`) | Instância Secundária (ex: `N.A.L.A`) |
|---|---|---|
| **Identificação** | `botId` ausente, `'PRIMARY'` ou `'MAIN'` (`isSecondary(context) === false`) | `botId` preenchido (ex: `bot_1795...`) (`isSecondary(context) === true`) |
| **Ramo em `webPanelService`** | Usa repositórios de servidor + `guild_settings` + `bot_config.json` | Usa `inst.config` lido/gravado via `multiBotManager.updateInstance()` |
| **Persistência no SQLite / Arquivo** | Tabelas do servidor (`guild_settings`, `guild_module_settings`, etc.) e `data/bot_config.json` | Tabela `bot_instance_configs` (colunas JSON isoladas por `bot_id`) |
| **Lado Discord (Resolução)** | `src/utils/botContextResolver.js` consulta `identityService`, `settingsService`, `guildModuleService` e `botConfig` | `src/utils/botContextResolver.js` lê `multiBotManager.getInstanceConfig(botInstanceId)` |

**Exceção conhecida:** as regras de escalonamento de advertências (`warn_escalation_rules`) via `moderationRepository` são sempre **por servidor** (`guild_id`), compartilhadas entre Principal e instâncias no mesmo servidor (tanto leitura quanto criação/exclusão no painel devem usar `modRepo`, nunca `cfg.moderation` isolado).

---

## 4. Índice de Funcionalidades

| Funcionalidade | Aba do Painel (`src/web/dashboard/`) | API (`src/web/server.js`) | Serviço / Método | Repo / Tabela | Lado Discord |
|---|---|---|---|---|---|
| **Ajuda (`/ajuda`, `+ajuda`)** | `tabs/settings.js`, `client/13-bot-config.js` | `GET`/`POST /api/bot/config` (~601, ~670) | `webPanelService` + `botConfig.js` / `multiBotManager.updateInstance` | `bot_config.json`, `guild_settings` (`help_menu_config`), `bot_instance_configs` | `commands/infrastructure/help.js`, `events/interactionCreate.js` (`help_category_select` ~1034), `handlers/prefixCommandHandler.js` (~4744), `utils/helpMenuHelper.js` (`buildHelpResponse` ~483), `utils/botContextResolver.js`, filtro `isHelpEnabled` em `commandRegistry.getSlashCommandsJSON` (~46) |
| **Prefixo** | `tabs/customcommands.js`, `tabs/settings.js`, `client/13-bot-config.js` | `POST /api/bot/config` (~670), `/modules/prefix` (~1138) | `settingsService.js` / `multiBotManager.updateInstance` | `guild_settings`, `bot_config.json`, `bot_instance_configs` | `utils/botContextResolver.js` (`resolvePrefix`), `handlers/prefixCommandHandler.js` (~255, ~4631), `commands/admin/prefix.js`, `events/messageCreate.js` (~270) |
| **Nome / Identidade** | `tabs/identity.js`, `tabs/overview.js`, `tabs/settings.js` | `GET /api/guilds/:id` (~1068), `GET`/`POST /api/bot/config` (~601, ~670) | `identityService.js` (`IdentityService`), `webPanelService.getGuildOverview` (~222) | `guild_settings`, `bot_config.json`, `bot_instance_configs` (`ai_name`) | `utils/botContextResolver.js` (`resolveBotName`), `commands/ai/aiNome.js` |
| **Deploy Slash Commands** | `tabs/modules.js`, `tabs/settings.js` (`#cfgHelpEnabled`) | Disparado ao salvar módulos (`guild_modules`) ou `help` | `multiBotManager.deployInstanceSlashCommands` (~793), `commandRegistry.deployCommands` (~149) | Cache em memória + Discord REST API | `events/ready.js` (~70), `commands/commandRegistry.js` (~46, ~149) |
| **Gating de Módulos** | `tabs/modules.js`, `client/15-modules-grid-switch.js` | `/modules/guild_modules` (~1138), `/api/multi-bot` (~872) | `guildModuleService.js` (`COMMAND_TO_MODULE_MAP` ~421), `multiBotManager.checkCommandAllowedForInstance` (~863) | `guild_module_settings`, `bot_instances.assigned_modules`, `bot_instance_configs.modules_state_json` | `events/interactionCreate.js`, `handlers/prefixCommandHandler.js` (~459), `events/messageCreate.js` |
| **Moderação / Warns** | `tabs/moderation.js`, `tabs/members.js`, `client/09-moderation-reviews.js` | `/modules/moderation` / `warns` (~1138) | `moderationService.js`, `warnEscalationService.js` (`WarnEscalationService` ~5) | `moderationRepository.js` (`moderation_punishments`, `warn_escalation_rules`, `anti_abuse_configs`) | `commands/moderation/*` (`punish.js`, `configMod.js`), `handlers/prefixCommandHandler.js` (~2765) |
| **Backups / Snapshots** | `tabs/moderation.js`, `client/10-backups-health-audit.js` | `/modules/backup` (~1138), `getGuildOverview` (~222) | `backupSecurityService.js`, `webPanelService` | `backupRepository.js` (`listBackups` ~31 → tabela `guild_backups`) | `commands/admin/backup.js` |
| **Tickets** | `tabs/tickets.js`, `client/03-guild-loader.js` | `/modules/tickets` (~1138) | `ticketService.js` (`TicketService` ~13) | `ticketRepository.js` (`tickets`, `ticket_panels`, `ticket_categories`, `ticket_guild_configs`) | `commands/tickets/*`, `events/interactionCreate.js` |
| **Economia & Cassino** | `tabs/economy.js`, `tabs/casino.js`, `client/08-economy-xp.js` | `/modules/economy`, `/modules/casino` (~1138) | `economyService.js` (`EconomyService` ~7), `blackjackService.js`, `loanService.js` | `economyRepository.js` (`economy_accounts`, `economy_currencies`, `economy_loans`, etc.), `casinoRepository.js` | `commands/economy/*`, `handlers/prefixCommandHandler.js` (~490) |
| **Música & Voz** | `tabs/music.js`, `client/08-economy-xp.js` | `/modules/music` (~1138) | `musicService.js` (`MusicService` ~414) | `musicVoiceRepository.js` (`music_guild_configs`) | `commands/music/*`, `handlers/prefixCommandHandler.js` (~2435) |
| **XP & Níveis** | `tabs/xp.js`, `client/08-economy-xp.js` | `/modules/xp` (~1138) | `experienceService.js` (`ExperienceService` ~8) | `xpRepository.js` (`guild_member_xp`, `xp_level_rewards`, `xp_multipliers_exemptions`) | `commands/xp/*`, `events/messageCreate.js` |
| **Presença & Status** | `tabs/identity.js`, `tabs/settings.js`, `client/13-bot-config.js` | `POST /api/bot/config` (~670) | `multiBotManager.applyInstancePresence` (~748) | `botPresenceRepository.js` (`bot_presence_configs`), `bot_instance_configs` | `utils/presenceHelper.js` (`applyBotPresence` ~20), `events/ready.js` (~108) |

---

## 5. Receitas Comuns

### Adicionar configuração de módulo
1. Adicione o campo HTML em `src/web/dashboard/tabs/<modulo>.js` e envie no JS correspondente em `src/web/dashboard/client/*.js` via `saveModule(...)`.
2. Em `src/services/webPanelService.js`, atualize os **dois** ramos em `getModuleConfig` (~702), `updateModuleConfig` (~1064) e, se necessário, `getGuildOverview` (~222): ramo `isSecondaryBot` (`inst.config`) e ramo `PRIMARY` (repositório).
3. Garanta o default na criação em `buildDefaultInstanceConfig` (`src/services/multiBotManager.js` ~17) se for instância.

### Adicionar comando de prefixo
1. Registre o nome/aliases em `src/handlers/prefixCommandHandler.js` na lista `KNOWN_COMMANDS` e associe ao módulo em `COMMAND_TO_MODULE_MAP` (`src/services/guildModuleService.js`).
2. Implemente o `case` dentro de `_executeCommand` (~432) sob a seção correta (`// ====`).

### Adicionar Slash Command (`/`)
1. Crie o arquivo em `src/commands/<categoria>/<nome>.js` exportando `{ data: new SlashCommandBuilder()..., async execute(interaction, context) }`.
2. Mapeie `<nome>` ao módulo em `COMMAND_TO_MODULE_MAP` (`src/services/guildModuleService.js`) para respeitar o gating por servidor e por instância.

### Adicionar ou refatorar uma aba no painel
1. Crie `src/web/dashboard/tabs/<nova>.js` no formato `module.exports = (ctx) => \`...\`` e o JS correspondente em `src/web/dashboard/client/`.
2. Registre o módulo em `src/web/dashboard/index.js` e adicione o botão na sidebar em `src/web/dashboard/parts/layoutStart.js`.
3. **Ferramenta de refactor seguro:** para qualquer alteração puramente estrutural no HTML do painel, use `node scripts/dashboard-snapshot.js <saida.html>` (fixture `scripts/fixtures/dashboard-fixture.json`) antes e depois para confirmar que o SHA-256 permanece idêntico.

---

## 6. Operações e Depuração Local

- **Executar suíte de testes:**
  ```powershell
  npm test
  ```
- **Commit + auditoria anti-vazamento + push com tag:**
  ```powershell
  npm run push "mensagem (vX.Y.Z)"
  # equivalente a scripts/safe-push.ps1
  ```
- **Reiniciar o bot (liberar porta 3000 antes, pois o bot aborta se estiver ocupada):**
  ```powershell
  $p = (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess
  Stop-Process -Id $p -Force
  node src/index.js
  ```
- **Consultar o SQLite diretamente via Node:**
  ```js
  const { dbManager } = require('./src/database/connection');
  dbManager.connect('data/cell.sqlite');
  console.log(dbManager.all('SELECT id, name, status FROM bot_instances'));
  ```
- **Testar endpoints `GET` do painel via Node/fetch:** envie o cabeçalho `'x-panel-password': '1598'` (e `'x-bot-id': '<id>'` para instâncias). Rotas `POST`/`PATCH` de módulos exigem também token CSRF de sessão; valide fluxos de escrita via testes unitários (`npm test`).
