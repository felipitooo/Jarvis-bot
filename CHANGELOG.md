# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [9.9.0] - 2026-11-19

### Adicionado
- **Persistência Total do Bot Ativo via LocalStorage (Sobrevive ao F5):**
  - O bot ativo selecionado agora é gravado automaticamente no `localStorage` do navegador (`jarvis_active_bot_id`).
  - Ao recarregar a página (F5) ou reabrir o painel web, a interface **não reseta mais para o Jarvis** e mantém exatamente a instância de bot que você estava editando.
  - Sincronização inicial instantânea nos 4 seletores (cabeçalho, barra lateral, banner superior universal e aba de módulos), recarregando dados da instância ativa desde o boot.
- **Compatibilidade Completa nas Seções Restantes da Sidebar:**
  - **Identidade & Presença:** Status, Tipo de Atividade e Texto de Status salvos e despachados em tempo real na presença do bot ativo selecionado (`applyInstancePresence`).
  - **Memórias da IA (Gemini):** Normalização e compatibilidade de memórias (`key`, `value`) em instâncias secundárias no painel (`saveInstanceMemory` / `deleteInstanceMemory`).
  - **Falar pelo Bot (Transmissor):** Auto-seleção da instância ativa e transmissão com avatar/nome correspondentes.
  - **Comandos Personalizados:** Suporte completo para criar, atualizar e excluir comandos mesmo com bot secundário ativo, sem ocultar a lista do servidor.
  - **Alertas Sociais (YouTube / Twitch / Reddit):** Visualização e cadastro de monitoramentos sociais mantendo contexto do bot ativo.
  - **Resumo Inteligente (Chat & Fofoca):** Resumos gerados pelo painel agora enviam no Discord usando a identidade e webhook/cliente da instância ativa selecionada (`X-Bot-Id`).
  - **Configurações Gerais & Base:** Suporte a edição isolada da instância secundária via `/api/bot/config` com banner contextual indicando qual bot está sendo customizado.
  - **Multi-Bot Manager:** Adicionado botão de ação rápida "⭐ Ativar / ✅ Ativo" diretamente na tabela de instâncias.

## [9.8.0] - 2026-11-19

### Adicionado
- **Compatibilidade Total de Todos os Módulos com a Opção "Bot Ativo" no Painel Web:**
  - Suporte completo e isolamento de contexto para todas as abas e módulos da sidebar (Dashboard & Saúde, Segurança & Membros, Economia & Suporte, IA e Personalização) ao selecionar um bot secundário ativo.
  - **Módulos Suportados por Instância Secundária:**
    - **Dashboard & Saúde:** Visão Geral com métricas dedicadas da instância, Métricas & Saúde em tempo real do bot selecionado, Histórico de Auditoria filtrado por bot (`botId`).
    - **Segurança & Membros:** Ações administrativas em Membros & Usuários (kick, ban, mute, warn) executadas com a identidade do bot ativo (`sendMemberAction`), Moderação & Anti-Spam com Anti-Bot Scam isolado, Gestão de TempBans com remoção associada à instância ativa, Boas-Vindas & AutoRole, Starboard.
    - **Economia & Suporte:** Economia & Banco com moedas de câmbio e taxas de empréstimo isoladas, Cassino & Apostas, Central de Tickets, Avaliações da Equipe.
    - **Inteligência Artificial & Customização:** XP & Níveis, Quiz & Perguntas, Presença do Bot em tempo real (`bot_presence` com `applyInstancePresence`), Memórias da IA (`aimemory` com `saveInstanceMemory` / `deleteInstanceMemory`), e Comandos Customizados.
  - **Sincronização Global do Bot Ativo na Interface:**
    - Adicionado seletor de Bot Ativo na Barra Lateral (`sidebarBotSelector`) diretamente abaixo de "SERVIDOR CONECTADO", garantindo visibilidade permanente.
    - Adicionado banner superior universal de Bot Ativo (`universalActiveBotBanner`) acima de todo o conteúdo das abas, exibindo o bot em foco com alternador rápido.
    - Sincronização automática e bidirecional de todos os 4 seletores de bot (`globalBotSelector`, `sidebarBotSelector`, `universalBannerBotSelect`, `moduleTargetBotSelect` e `speakBotInstanceSelect`), recarregando métricas, auditoria, configurações e módulos sem necessidade de recarregar a página inteira.
  - **Endpoints e Serviços Atualizados:**
    - `WebPanelService.getGuildOverview`: agora retorna o dicionário completo de módulos (`tickets`, `moderation`, `antiBotScam`, `audit`, `welcome`, `autorole`, `starboard`, `music`, `economy`, `casino`, `social`, `reviews`, `briefing`, `xp`, `quiz`, `botPresence`, `aiMemories`, `tempbans`) para qualquer bot secundário ativo.
    - `WebPanelService.updateModuleConfig`: suporte a `xp`, `bot_presence`, `aimemory`, `tempbans` e `bot_speak` isolados por instância.
    - `WebPanelService.getGuildAuditLogs`: suporte a filtro prioritário por `botId`.
    - Rotas da API (`/api/guilds/:guildId/audit`, `/api/guilds/:guildId/members/:userId/action`): agora extraem e respeitam `X-Bot-Id` e `botId`.

## [9.7.0] - 2026-11-19

### Corrigido
- **Isolamento de Identidade Multi-Bot no Painel Web (`/api/guilds/:guildId/settings`):**
  - Corrigido o bug onde salvar configurações gerais ou o nome de um bot secundário (ex: Nala) no Painel Web alterava o nome global do Jarvis (`ai_display_name` em `guild_settings`) e não alterava a instância secundária.
  - A rota `/api/guilds/:guildId/settings` agora recebe e respeita o cabeçalho `X-Bot-Id` e os parâmetros de `botId`.
  - Ao atualizar as configurações com um bot secundário selecionado, `WebPanelService.updateGuildSettings` atualiza a instância específica no `MultiBotManager` (`inst.name` e `inst.config.aiName`) sem contaminar as configurações base do servidor do Jarvis.
  - Corrigida a propagação de prefixo e comandos em `MultiBotManager.updateInstance`, garantindo que atualizações de prefixo em instâncias secundárias sejam devidamente aplicadas.
  - O painel web agora propaga o `targetBot` ativo ao salvar nome e canais de IA, atualizando o mapa e as opções da interface em tempo real.

### Adicionado
- **Ciclo Diário Automático da Bolsa Stark às 18:01:**
  - O agendador automático do ciclo da Bolsa Stark (`startStockMarketDailyCycle`) agora opera com base no relógio civil diário às **18:01** (com recálculo contínuo para eliminação total de drift temporal), em vez de um intervalo fixo.
  - Atualizado o status do ciclo (`getStockMarketCycleStatus`) e o indicador no Painel Web para exibir `Ativo (18:01)`.

## [9.6.0] - 2026-11-19

### Adicionado
- **Armazenamento de Moedas de Câmbio no Banco (Cofre Bancário Stark):**
  - Adicionada a migração `037_currency_bank_support.sql`, introduzindo a coluna `bank_amount` na tabela `economy_user_currencies`.
  - Moedas de câmbio e de prestígio (ouro, platina, diamantes, btc) agora podem ser depositadas no cofre do banco e sacadas para a carteira a qualquer momento.
  - No cofre do banco, as moedas de câmbio ficam **100% protegidas contra roubos e assaltos (`+rob` / `+crime`)**, garantindo a segurança do patrimônio dos usuários.
  - Implementados métodos dedicados `depositExchangeCurrency`, `withdrawExchangeCurrency`, `transferUserCurrencyToBank` e `transferUserCurrencyFromBank` em `EconomyRepository` e `EconomyService`.
  - Suporte completo no comando `+dep`: `+dep <quantia> [moeda]` (ex: `+dep 2 ouro` ou `+dep all ouro`), com suporte à ordem invertida flexível (`+dep ouro 2`).
  - Suporte completo no comando `+sac` / `+sacar` / `+with`: `+sac <quantia> [moeda]` (ex: `+sac 2 ouro` ou `+sac all ouro`), com suporte à ordem invertida flexível (`+sac ouro 2`).
  - Novos subcomandos em `+cambio`: `+cambio dep <moeda> [quantidade|tudo]` e `+cambio sac <moeda> [quantidade|tudo]`.
  - Exibição transparente nos comandos de saldo (`+saldo`, `+banco`, `+bal`, `/balance`): detalhamento separado do saldo em carteira (`👛 Carteira`) e guardado no cofre (`🏦 Banco`) de cada moeda de câmbio, além do cálculo unificado do patrimônio total (`💎 Patrimônio Total`).
  - Comandos de barra `/depositar` e `/sacar` atualizados com o parâmetro opcional `moeda` para operações de câmbio.

## [9.5.0] - 2026-11-19

### Adicionado
- **Handler Interativo de Reversão de Silenciamento (`undo_mute_`):**
  - Implementado o suporte no `src/events/interactionCreate.js` para o botão interativo `"Desfazer Silenciamento (Unmute)"` gerado no comando `+mute`.
  - Permite aos moderadores reverter o timeout de um membro diretamente pelo botão mesmo após reinicialização do bot ou expiração do coletor inline, sincronizando a ação com a malha inter-bot (`InterBotBridge`).
- **Controle de Modo Sem Prefixo na Central de Identidade:**
  - Adicionado o checkbox `prefixlessModeCheckbox` na aba de Identidade do Assistente (`#tab-identity`) do Painel Web, permitindo ativar ou desativar o acionamento direto de comandos pelo nome por servidor, com persistência na rota `/api/guilds/:guildId/settings` e no serviço de configurações.

### Corrigido
- **Correção de Botões Quebrados e IDs Duplicados no Painel Web (`dashboardHtml.js`):**
  - Removido o card duplicado de "Resumo Inteligente do Chat (IA)" na aba de relatórios executivos (`#tab-briefings`), substituindo por um card de atalho direto para a central de resumos (`#tab-summaries`), eliminando a colisão de IDs (`summaryChannelSelect`, `summaryTypeSelect`, `generateSummaryBtn`, `copySummaryBtn`).
  - Corrigido o bug onde o botão `generateSummaryBtn` da central de resumos não respondia ao clique do usuário por colisão de seletores.
  - Removido o botão órfão `saveBotThemeBtn` acidentalmente colocado na área de mensagens diretas de membros (`#tab-members`), restaurando o funcionamento pleno do botão oficial de salvamento de tema na aba de personalização.
  - Ajustado o formulário de personalização de cores para não sobrescrever nem resetar os 26 módulos dinâmicos com propriedades legadas ao salvar temas.
- **Limpeza de Interações Duplicadas no Discord (`interactionCreate.js`):**
  - Unificados e limpos os seletores e tratamentos redundantes de falência corporativa (`comp_bankrupt_yes_`), botões empresariais e abertura de painéis de tickets.

## [9.4.0] - 2026-11-19

### Adicionado
- **Isolamento Completo de Auditoria Multi-Bot (`AuditService` & Eventos Discord):**
  - Implementado suporte nativo a `botInstanceId` e `client` em `AuditService.logAction` e `AuditService.dispatchDiscordAudit`.
  - Quando um bot secundário (ex: `Dumb`) é configurado para auditoria ou executa uma ação, o envio do embed de auditoria para o canal configurado (`#administração`) é realizado **exclusivamente pelo cliente Discord daquele bot**, com seu próprio nome e avatar.
  - O gerador de provas visuais (`generateMessageProof`) agora estampa o avatar e o nome da instância responsável (ex: `Dumb`), sem interferência do Jarvis.
  - Eventos de exclusão e edição de mensagem (`messageDelete.js` e `messageUpdate.js`) agora filtram com precisão as instâncias: se `audit` estiver desativado no Jarvis, Jarvis **permanece em silêncio absoluto** e não envia embeds de auditoria no canal configurado para o bot secundário.

### Corrigido
- **Correção da Desconfiguração Cruzada entre Bot Principal e Bot Secundário no Painel Web:**
  - Corrigido o bug em `src/services/webPanelService.js` onde configurar o canal de auditoria de um bot secundário sobrescrevia a configuração global `audit_channel_id` do Jarvis.
  - `getGuildOverview` e `getModuleConfig` agora recebem `botId` e retornam fielmente as configurações isoladas da instância selecionada no seletor global (`#globalBotSelector`).
  - Todas as abas do painel (`audit`, `moderation`, `welcome`, `autorole`, `tickets`, `starboard`, `music`, `economy`, `casino`, `quiz`, `briefing`, `custom_commands`, `anti_bot_scam`, `reviews`) agora salvam diretamente na configuração isolada da instância (`inst.config`) sem poluir nem desconfigurar o bot principal.
  - Restaurado o valor de `audit_channel_id` do Jarvis no banco de dados para evitar qualquer emissão indevida de logs de auditoria por parte do bot principal.

## [9.3.0] - 2026-11-19

### Adicionado
- **Malha de Comunicação Inter-Bot (InterBotBridge Mesh Event Bus):**
  - Implementada a arquitetura descentralizada de comunicação inter-bot em `src/services/interBotBridge.js` conectada à migração `036_inter_bot_communication_mesh.sql`.
  - Permite aos bots (`J.A.R.V.I.S.` e instâncias secundárias como `Dumb`) transmitirem pacotes de sincronização de moderação, sinais de presença, batimentos de rede e mensagens diretas sem concorrência ou loops infinitos de recursão.
  - Comandos `+bots`, `+rede` e `+mesh` no chat exibindo nós online, pacotes trocados, telemetria de rede e status da malha em tempo real.
  - Nova ferramenta de IA `consultar_ou_enviar_mensagem_outros_bots` em `src/ai/tools/fridayTools.js` permitindo ao orquestrador consultar o estado de outros bots ou transmitir notas e alertas.
  - Rotas de API `/api/multi-bot/mesh` e `/api/multi-bot/mesh/send` para monitoramento e envio de pulsos de teste pelo painel web.
- **Seletor Global de Bot no Cabeçalho do Painel Web (`globalBotSelector`):**
  - Adicionado dropdown `🤖 Bot Ativo` no topo do painel, permitindo alternar instantaneamente entre o Bot Principal e qualquer instância secundária cadastrada.
  - Toda aba do painel (`Módulos & Plugins`, `Moderação`, `Boas-Vindas`, `Tickets`, `Starboard`, `Falar pelo Bot`, etc.) agora opera e salva exclusivamente sobre o bot selecionado, resolvendo o problema de impossibilidade de configurar módulos em bots secundários.
- **Exibição do Status Disciplinar e Mute Ativo no Perfil (`+perfil` / `/perfil`):**
  - O gerador de perfil (`src/utils/profileBuilder.js`) agora detecta ativamente timeouts no Discord (`member.isCommunicationDisabled()`) e no SQLite (`moderation_punishments`), exibindo aviso `🔇 SILENCIADO (Timeout Ativo)` com contagem regressiva Discord e motivo em ambas as abas (Geral e Social).

### Corrigido
- **Isolamento Total de Execução Modular entre Bot Principal e Secundários:**
  - Corrigido o bug onde desativar um módulo no bot principal bloqueava a execução em instâncias secundárias (ex: `auto_protection`, `quiz`, `xp`, `ai_chat`, `starboard`, `welcome`).
  - O sistema de verificação em `messageCreate.js`, `messageReactionAdd.js`, `guildMemberAdd.js` e `orchestrator.js` agora avalia exclusivamente a configuração da instância em execução quando `context.botInstanceId` estiver presente.
- **Silêncio de Módulos Desativados no Chat (Regra "Não Falar"):**
  - Garantido que quando qualquer comando ou módulo estiver desativado para um bot específico, ele permaneça 100% silencioso (`return false;`), nunca enviando mensagens de "Módulo Desativado!" no chat público.
- **Catálogo de Emojis do Servidor e Compatibilidade Síncrona:**
  - `getGuildAndExternalEmojis` em `src/utils/emojiHelper.js` atualizado para catalogar emojis de forma síncrona com busca prioritária em instâncias Multi-Bot e suporte a fetch prévio assíncrono na rota da API REST do painel.

## [9.2.0] - 2026-11-19

### Adicionado
- **Gateway Intent `GuildExpressions` para Clientes Discord:**
  - Adicionado `GatewayIntentBits.GuildExpressions || GatewayIntentBits.GuildEmojisAndStickers` tanto no cliente principal (`src/index.js`) quanto em todas as instâncias Multi-Bot (`src/services/multiBotManager.js`). Isso garante que o cache de emojis customizados (`guild.emojis.cache`) seja preenchido e mantido atualizado pelo Discord Gateway em tempo real.
- **Fluxo de Moderação Direto com Desfazer Imediato (`+mute`):**
  - O comando `+mute` (e aliases `+timeout`, `+mutar`, `+silenciar`) agora aplica a punição **imediatamente** e sem atraso na chamada do comando, enviando um card informativo com Infrator, Moderador, Duração e Motivo, acompanhado do botão interativo `[ ↩️ Desfazer Silenciamento (Unmute) ]`.
  - Elimina o risco de cancelamentos acidentais por botões de confirmação modal durante emergências no servidor, oferecendo reversão em 1 clique durante 5 minutos para o moderador responsável.
- **Seletor de Emojis em Todos os Campos Restantes de "Falar pelo Bot":**
  - Inserido o botão disparador de emojis (`😀`) nos campos de Título (`speakEmbedTitle`), Nome do Autor (`speakEmbedAuthorName`) e Texto de Rodapé (`speakEmbedFooterText`) da aba principal "Falar pelo Bot", permitindo personalizar com emojis todo o conteúdo de comunicados e embeds.

### Corrigido
- **Carregamento e Exibição de Emojis do Servidor no Emoji Picker ("Meu Servidor"):**
  - Corrigida a função `ensureEmojiCatalogLoaded()` no painel web (`dashboardHtml.js`) para resolver o ID do servidor mesmo em páginas do Multi-Bot onde `currentGuildId` não estava selecionado.
  - Corrigida a rota `/api/guilds/:guildId/emojis` em `src/web/server.js` e `src/services/webPanelService.js` para buscar emojis via API REST do Discord caso o cache local do bot esteja vazio ao inicializar.
  - O catálogo de emojis de outros servidores agora suporta de forma transparente tanto estruturas agrupadas por servidor quanto listas planas de emojis, garantindo contagem e renderização sem erros.
- **Presença Customizada em Tempo Real para Instâncias Multi-Bot (`Dumb`):**
  - Corrigido o gerenciamento de presença no Discord Gateway v10: agora define o texto customizado no campo `state` do objeto de presença.
  - Corrigido `getInstanceConfig()` e `applyInstancePresence()` no `MultiBotManager` para garantir que o nome real e frase de status de instâncias secundárias (ex: `Dumb | +ajuda`) sejam preservados sem regredir para a presença padrão do Jarvis.
- **Restabelecimento dos Módulos no Banco de Dados:**
  - Restaurados os módulos de `moderation` e `auto_protection` para ativos no servidor após testes manuais anteriores.

## [9.1.0] - 2026-11-19

### Adicionado
- **SELETOR UNIVERSAL DE EMOJIS EM TODAS AS TELAS E CAMPOS DO BOT:**
  - **Catálogo de Emojis Padrão & Globais (Unicode Integrado):** Adicionada nova aba **✨ Padrão & Globais** com 72+ emojis categorizados (Expressões, Economia & Cassino, Moderação & Segurança, Social & Atendimento) acessíveis instantaneamente mesmo em servidores sem emojis customizados.
  - **Botão Seletor de Emojis (`😀`) em Todos os Campos:** Integrado o botão de inserção de emoji ao lado de todos os inputs do painel:
    - *Status & Presença do Bot Principal* (`botActivityNameInput`) e *Instâncias Secundárias* (`mbCfgPresenceText`).
    - *Identidade e Nome da IA* (`aiNameInput`, `mbCfgAiName`).
    - *Boas-Vindas & Despedidas* (`welcomeMsgInput`, `goodbyeMsgInput`, `mbCfgWelcomeMsg`, `mbCfgGoodbyeMsg`).
    - *Economia & Starboard* (`currencySymbolInput`, `mbCfgEcoSymbol`, `starboardEmojiInput`, `mbCfgStarEmoji`).
    - *Central de Tickets* (`mbCfgTicketTitle`, `mbCfgTicketDesc`).
    - *Transmissor Falar pelo Bot* (`speakContentInput`, `speakEmbedDesc`, `mbSpeakContentInput`, `mbSpeakEmbedTitle`, `mbSpeakEmbedDesc`, `mbSpeakEmbedFooter`).
  - **Migração `035_starboard_custom_emoji.sql`:** Adicionada coluna `starboard_emoji` na tabela `community_starboards`, permitindo configurar qualquer emoji personalizado ou padrão para acionar o mural.

### Corrigido
- **Silenciamento Completo de Módulos/Comandos Desativados:**
  - Quando um comando de prefixo pertence a um módulo desativado (ou comando desativado na instância), o bot agora permanece **completamente silencioso** (`return false`), sem enviar mensagens de aviso ou poluir o canal de chat do servidor com `⚠️ Módulo Desativado!`.
- **Isolamento Modular Independente para Instâncias Multi-Bot (`Dumb`, etc.):**
  - Corrigido o bug onde desativar um módulo no painel principal do Jarvis (`GuildModuleService`) desativava o módulo para todos os bots secundários do servidor.
  - O `prefixCommandHandler` e o `interactionCreate` agora verificam primeiro e exclusivamente o `multiBotManager.checkCommandAllowedForInstance()` para instâncias secundárias (`context.botInstanceId`), garantindo que se o Jarvis estiver com moderação desligada, o bot secundário (`Dumb`) continue executando suas funções de moderação normalmente.
  - Corrigido o fallback de presença para instâncias secundárias em `multiBotManager.getInstanceConfig()`: instâncias com nome próprio (ex: `Dumb`) nunca mais herdam `J.A.R.V.I.S | +ajuda`.

## [9.0.0] - 2026-11-19

### Adicionado
- **RELEASE ESTÁVEL V9.0.0 — ISOLAMENTO TOTAL EM TEMPO REAL NO DISCORD & 24 SEÇÕES POR BOT:**
  - **Transmissor `🔊 Falar pelo Bot` por Instância Multi-Bot (`POST /api/multi-bot/:id/speak` e Seletor Global `#speakBotInstanceSelect`):**
    - Nova seção **19. 🔊 Falar pelo Bot** dentro da página administrativa de cada bot secundário (`mb-sec-botspeak`), permitindo enviar mensagens de texto e cards de Embed personalizados diretamente pela conta Discord daquela instância (`multiBotManager.speakWithInstance`).
    - Seletor **"🤖 Bot Transmissor"** na aba principal `🔊 Falar pelo Bot`, permitindo escolher se a mensagem será enviada pelo bot principal (`J.A.R.V.I.S`) ou por qualquer instância cadastrada (`Dumb`, etc.).
  - **Expansão da Página Individual de Cada Bot para 24 Seções Completas (`src/web/dashboardHtml.js`, `src/services/multiBotManager.js`):**
    - Adicionadas as seções operacionais dedicadas dentro da página de cada bot: **19. 🔊 Falar pelo Bot**, **20. 🛡️ Anti-Bots & Scams**, **21. 👋 Boas-Vindas, Despedidas & AutoRole**, **22. ⭐ Starboard**, **23. 🎰 Cassino & Quiz Arena** e **24. 🧠 Resumo Inteligente**, além das 18 seções administrativas base.
  - **Inicialização e Encerramento Automático de Instâncias Secundárias (`src/index.js`):**
    - O `bootstrap()` agora inicia automaticamente todas as instâncias habilitadas do Multi-Bot Manager ao subir o servidor e o `shutdown()` encerra todas com segurança.

### Corrigido
- **Sincronização em Tempo Real de Status & Presença de Bots Secundários no Discord (`src/events/ready.js`, `src/services/multiBotManager.js`, `src/services/identityService.js`):**
  - Corrigido o bug onde bots secundários (como `Dumb`) exibiam o status do bot principal (`J.A.R.V.I.S | +ajuda`) ao conectar: `ready.js` agora lê `botInstanceConfig` exclusivo da instância e usa o token correto da instância ao publicar comandos Slash.
  - Ao clicar em **Salvar Configurações deste Bot** na página da instância, `multiBotManager.updateInstance()` agora invoca `_syncLiveInstance()` e `applyInstancePresence()`, aplicando o novo status/frase (ex: `Dumb | +ajuda`), nome da IA, modelo Gemini, prefixo e módulos **instantaneamente no Discord** sem precisar reiniciar o bot.
  - Isolados os gatilhos de nome em `src/events/messageCreate.js` e `IdentityService.forcedInstanceName`: um bot secundário (`Dumb`) responde apenas ao seu próprio nome (`Dumb`) e prefixo configurado, jamais respondendo quando alguém chama `"Jarvis"`.
- **Bloqueio Total de Todos os 224 Comandos/Aliases de Prefixo (`+mute`, `+banir`, etc.), 83 Comandos Slash, 65 Ferramentas de IA e Botões Interativos (`src/services/guildModuleService.js`, `src/handlers/prefixCommandHandler.js`, `src/events/interactionCreate.js`):**
  - Corrigido o bug onde `+mute @usuario` ainda executava mesmo com **Moderação Manual (`moderation`)** desativado: mapeados todos os 224 comandos e aliases de prefixo (`mute`, `mutar`, `silenciar`, `unmute`, `desmutar`, `desilenciar`, `banir`, `desbanir`, `expulsar`, `purge`, `lockdown`, `trancar`, `destrancar`, `advertir`, `warnlist`, `clearwarns`, `trampo`, `bico`, `21`, `cacaniqueis`, etc.), todos os 83 comandos Slash, todas as 65 ferramentas de IA e todos os prefixos de botões/modais (`checkInteractionAllowed`).
  - Desativar um módulo pai (ex: `moderation`) agora desativa e persiste automaticamente seus submódulos dependentes (ex: `auto_protection`) tanto no servidor quanto na instância Multi-Bot.

## [8.5.0] - 2026-11-18

### Adicionado
- **OPERAÇÃO DE CORREÇÃO TOTAL — JARVIS V8.5.0 (Auditoria, Persistência Real, Isolamento Multi-Bot & Testes com Discord Mock):**
  - **Migração SQLite `034_multi_bot_isolated_configs_and_summaries.sql`:**
    - Tabela `bot_instance_configs`: armazena em formato estruturado as 18 seções independentes de configuração para cada instância cadastrada no Multi-Bot Manager (`bot_id` PK).
    - Tabela `bot_instance_memories`: banco de memória de IA isolado por instância (`bot_id`, `guild_id`, `scope`, `subject_id`, `memory_key`, `memory_value`).
    - Tabela `bot_instance_logs`: histórico persistente de logs operacionais e erros isolado por instância (`bot_id`).
    - Tabela `channel_summaries`: histórico persistente de todos os resumos inteligentes de chat gerados (`guild_id`, `channel_id`, `message_count`, `summary_text`, `participants_json`, `triggered_by`).
  - **Página Administrativa Individual de 18 Seções por Instância Multi-Bot (`src/services/multiBotManager.js`, `src/web/server.js`, `src/web/dashboardHtml.js`):**
    - Ao clicar em qualquer bot no Multi-Bot Manager, abre uma central administrativa dedicada exclusivamente àquela instância com 18 seções completas e persistentes no SQLite:
      1. Visão geral (Identidade, Prefixo, Notas)
      2. Status e presença (Online/Idle/DND, Tipo e Texto de atividade)
      3. Módulos (Ativação individual dos 26 módulos exclusivos da instância)
      4. Inteligência artificial (Modelo Gemini, Temperatura, Personalidade, Prompt customizado)
      5. Memória (Política de retenção + CRUD de memórias isoladas por `bot_id`)
      6. Comandos (Toggles e aliases personalizados por instância)
      7. Moderação (Anti-Spam, Anti-Links, Anti-Bot Scam, Canal de log)
      8. Economia e XP (Moeda, Recompensa diária, Taxa de XP)
      9. Música (Volume padrão, DJ Role, Limite de fila, Auto-leave)
      10. Tickets (Categoria, Cargo de suporte, Limite por usuário, Transcript)
      11. Sistemas sociais (Casamentos, Reputação, Avaliações, Aniversários)
      12. Automações (Briefing diário, Lembretes, Limpeza automática)
      13. Embeds e imagens (Tema Stark, Cor primária, Rodapé customizado)
      14. Permissões (Cargos Admin/Mod, Bypass de dono, Canais bloqueados)
      15. Integrações (Webhooks, Alertas YouTube/Twitch/Reddit, Pesquisa Web)
      16. Banco de dados (Namespace SQLite isolado, contadores de registros da instância)
      17. Logs e erros (Visualização e limpeza de eventos/erros exclusivos da instância)
      18. Configurações avançadas (Rate limit, Timeout de comandos, Debug mode, Exclusão segura)
    - Isolamento lógico absoluto: alterações feitas no Bot A jamais afetam o Bot B ou o bot principal.
  - **Fonte Única de Verdade para o Sistema de 26 Módulos (`src/services/guildModuleService.js`):**
    - Catálogo único com metadados completos para todos os 26 módulos: `id`, `name`, `description`, `category`, `dependencies`, `requiredPermissions`, `commands`, `events`, `automations`, `configTab`, `healthStatus` e `errorLog`.
    - Validação de dependências (`validateDependencies`): ativar um módulo com dependências ativa automaticamente seus pré-requisitos (ou bloqueia no modo estrito); desativar um módulo base desativa em cascata os módulos dependentes para evitar estados inconsistentes.
    - Bloqueio físico completo em tempo de execução: comandos (`checkCommandAllowed`), ferramentas de IA (`checkToolAllowed`), eventos do Discord (`checkEventAllowed` integrado em `messageCreate.js`, `guildMemberAdd.js`, `guildMemberRemove.js`, `messageReactionAdd.js`, `communityService.js`) e rotinas automáticas (`checkAutomationAllowed` integrado em `automationService.js`).
    - Preservação integral de dados no SQLite ao desativar e reativar módulos.
  - **Suíte Automatizada com Discord Mock & Teste de Persistência (`tests/discordMockAndPersistence.test.js`):**
    - Simulador completo de Guilds, Canais, Membros, Mensagens e Eventos sem necessidade de servidor Discord real conectado.
    - 9 testes automatizados cobrindo isolamento Bot A vs Bot B após restart, ciclo completo dos 26 módulos, bloqueio de eventos/comandos, preservação de dados, resumo inteligente factual e persistência de todas as abas após F5.

### Corrigido
- **Persistência Completa no Painel Web após Atualização de Página (F5) e Reinício do Servidor:**
  - Corrigida a ordem de inicialização no `src/web/dashboardHtml.js` onde `restoreInitialTab()` era invocada antes da definição de `loadTempbans`, `loadGuildModules` e `loadMultiBotInstances`, e adicionados gatilhos automáticos de carregamento em `switchTab()`.
  - Corrigida a divergência camelCase vs snake_case (`antiBotScamEnabled` vs `anti_bot_scam_enabled` em `webPanelService.js`, e `sourceId` vs `source_id` em `socialAlertRepository.js`), garantindo que a Proteção Anti-Bot Scam e os Alertas Sociais permaneçam preenchidos ao atualizar a página com F5.
  - Removidas as caixas de seleção de módulos duplicadas da aba `Configurações Gerais`, mantendo todos os 26 módulos centralizados na aba `Central de Módulos` com atalhos diretos para suas respectivas abas de configuração.
- **Resumo Inteligente do Chat & Fallback Automático de Modelo Gemini (`src/services/gossipService.js`, `src/ai/adapters/geminiAdapter.js`, `src/services/webPanelService.js`):**
  - Corrigido o retorno da rota `/api/guilds/:id/chat-summary` (`summary: text`) e removido o listener duplicado de `#generateSummaryBtn` que exibia falso erro no painel.
  - Adicionado fallback automático no `GeminiAdapter` para os modelos `gemini-2.5-flash` -> `gemini-2.0-flash` -> `gemini-1.5-flash` caso o modelo configurado retorne HTTP 404 na API Google v1beta.
  - Aprimorado o motor extrativo de resumo (`_generateMockSummary`) para extrair participantes reais, fatos, números, declarações e linha do tempo com data e horário de Brasília (`America/Sao_Paulo`), salvando cada resumo gerado na tabela `channel_summaries`.
- **Backup de Servidor (`src/services/backupSecurityService.js`):**
  - Corrigido `TypeError: Cannot read properties of undefined (reading 'bitfield')` ao criar snapshot de cargos e canais com permissões simplificadas.

## [8.0.0] - 2026-11-18

### Adicionado
- **MISSÃO OFICIAL — JARVIS V8.0.0 ULTIMATE EVOLUTION:**
  - **Sistema Completo de Banimento Temporário (TempBan) (`src/database/repositories/moderationRepository.js`, `src/services/moderationService.js`):**
    - Subcomando Slash `/punir tempban` com seleção de membro, motivo obrigatório e duração personalizada (`30m`, `2h`, `7d`, `1mo`).
    - Comando de Prefixo `+tempban @usuario <duracao> <motivo>` com modal de confirmação visual e validação de hierarquia.
    - Persistência estruturada no SQLite (`temp_bans`) com expiração em timestamp ISO, rastreamento de administrador responsável e histórico.
    - Worker em background integrado ao agendador (`automationService.js`) que verifica a cada 15s banimentos expirados e remove o banimento no Discord com tratamento resiliente de erros.
    - Cancelamento antecipado de banimento temporário via `/punir unban` e pelo Painel Web com motivo auditado.
  - **Central Modular de 26 Funcionalidades com Bloqueio Real (`src/services/guildModuleService.js`):**
    - Controle independente por servidor para 26 módulos: Inteligência Artificial, Memória da IA, Ferramentas de IA, Música & Player, Recursos de Voz, Economia, Cassino, XP & Níveis, Tickets, Moderação Manual, Proteção Automática, Sistema Social, Casamentos, Reputação, Avaliações, Quiz Arena, Sorteios, Enquetes, Boas-Vindas, Despedidas, AutoRole, Starboard, Automações & Briefings, Lembretes, Diversão e GIFs/Imagens.
    - Interceptores físicos em tempo de execução: o desligamento de um módulo bloqueia comandos de prefixo (`prefixCommandHandler.js`), comandos slash (`interactionCreate.js`) e execução de ferramentas da IA (`toolRegistry.js`).
  - **Inspeção Segura de Arquivos em RAM & Zero-Disk (`src/utils/safeArchiveInspector.js`, `src/utils/attachmentProcessor.js`):**
    - Inspeção in-memory de arquivos compactados PKZIP (`.zip`, `.jar`, `.docx`, `.xlsx`) e `.rar` sem escrita no disco rígido.
    - Proteção ativa contra Zip Bombs: detecção de taxa de descompressão abusiva (> 100:1) e teto de descompactação máxima de 25 MB.
    - Proteção estrita contra Path Traversal: detecção e rejeição imediata de entradas perigosas com `..`.
    - Extração inteligente de texto: suporte nativo a DOCX (`word/document.xml`), XLSX (`xl/sharedStrings.xml`), JAR (manifesto e classes) e arquivos de texto em ZIPs.
    - Suporte ampliado a anexos: PDF, DOCX, XLSX, TXT, JSON, CSV, JavaScript, Java, ZIP, RAR, JAR, PNG, JPG, WEBP e GIF.
  - **Pesquisa na Internet com Citações para a IA (`src/ai/tools/fridayTools.js`):**
    - Nova ferramenta `pesquisar_web` para o Gemini consultar informações em tempo real via DuckDuckGo com formatação estruturada e citações numeradas `[1] Titulo - URL`.
  - **Sistema Multi-Bot Manager 100% Opcional (`src/services/multiBotManager.js`):**
    - Capacidade de hospedar bots secundários independentes sob a mesma infraestrutura Jarvis sem interferir no bot principal.
    - Token individual sempre mascarado (`••••••••••••`), monitoramento de consumo de RAM por instância e isolamento de falhas.
    - Distribuição flexível de funcionalidades e comandos por bot através de rotas REST dedicadas (`/api/multi-bot`).
  - **Padronização Centralizada de Identidade Visual (`src/utils/embedFactory.js`):**
    - Classe `EmbedFactory` unificando a identidade visual do Jarvis com paleta de alta tecnologia (`#00E5FF` Cyan, `#10B981` Emerald, `#F59E0B` Amber, `#EF4444` Crimson).
    - Métodos para base, sucesso, erro, aviso, confirmação de ações críticas e rodapés paginados consistentes.
  - **Painel Web Modernizado com Abas Dedicadas (`src/web/dashboardHtml.js`, `src/web/server.js`, `src/services/webPanelService.js`):**
    - Nova Aba **Proteção Anti-Bots & Scams** (`tab-antibot`): configuração de punição (mute/kick/ban), tempo de mute, canais ignorados e regras ativas contra golpes estilo MrBeast e links falsos.
    - Nova Aba **Banimentos Temporários** (`tab-tempbans`): tabela em tempo real com contador decrescente, motivo, administrador e botão de cancelamento imediato.
    - Nova Aba **Resumo Inteligente** (`tab-summary`): controle de volume de mensagens (20 a 300 mensagens), exibição do resumo estruturado em Markdown e opção de publicação direta no canal do Discord.
    - Nova Aba **Central dos 26 Módulos** (`tab-modules`): interface intuitiva com botões toggle independentes para cada um dos 26 módulos e campo de busca rápida.
    - Nova Aba **Multi-Bot Manager** (`tab-multibot`): gerenciamento de instâncias secundárias com status, memória e ações de iniciar/parar.
    - Nova Aba **Alertas Sociais** (`tab-alerts`): canais de YouTube, Twitch e Reddit com templates customizáveis de notificação.

### Corrigido
- **Correção Geral de Salvamentos & Resolução de HTTP 500 no Painel Web:**
  - Eliminação definitiva de erros internos de servidor ao salvar módulos (backups, moderação, tickets, etc.) com transações seguras no SQLite e autoconexão de chaves estrangeiras.
- **Resumo Inteligente do Chat:**
  - Corrigido o desempacotamento de resposta do Gemini LLM (`response?.text || response`), restabelecendo resumos contextuais precisos com horário de Brasília e linha do tempo de 300 mensagens.

## [7.5.0] - 2026-11-18

### Corrigido
- **Correção Crítica no Resumo Inteligente do Chat (`src/services/gossipService.js`):**
  - **Desempacotamento de Resposta do Gemini:** Corrigida falha onde a resposta da API do Gemini retornava `{ text, toolCalls }` e a verificação estrita `typeof response === 'string'` avaliava como falsa, descartando indevidamente a resposta gerada pela IA e ativando o fallback estático de mock com mensagens genéricas. Agora `responseText` extrai fielmente `response?.text || response`.
  - **Timestamps em Linha do Tempo Real:** Mensagens enviadas para o LLM agora incluem horários de envio `[HH:mm]` com base no fuso horário oficial (Brasília, UTC-3), permitindo ao modelo compreender perfeitamente a sequência temporal dos acontecimentos.
  - **Ancoragem Factual & Detalhada:** Prompt atualizado com diretrizes rígidas exigindo citação direta dos tópicos reais debatidos (jogos, trabalho, piadas, programação, desabafos) e posicionamento individual dos participantes.

### Adicionado
- **Sincronização Temporal Ativa & Data/Hora Atualizada no Bot:**
  - **Injeção de Data e Hora Real no Prompt do Sistema (`src/ai/prompts/systemPrompt.js`):** Injetadas a data de hoje por extenso, dia da semana, horário em tempo real (Brasília/DF, UTC-3) e timestamp ISO no `buildSystemPrompt`, garantindo que o Jarvis sempre saiba o momento presente do mundo real em qualquer interação.
  - **Nova Ferramenta de IA `obter_data_hora_atual` (`src/ai/tools/fridayTools.js`):** Ferramenta analítica registrada no catálogo para consultar data, dia da semana e horário atômico atualizados.
  - **Comandos de Prefixo de Horário Oficial (`+data`, `+hora`, `+horario`, `+tempo`, `+relogio`):** Adicionados comandos rápidos no `prefixCommandHandler.js` exibindo embed completo com data, horário oficial de Brasília e tempo de uptime do bot.


## [7.4.0] - 2026-11-18

### Corrigido
- **Correção Geral de Salvamentos & Resolução de HTTP 500 no Painel Web:**
  - **Injeção de Dependências Faltantes no WebPanelService (`src/index.js`):** Injetadas as instâncias de `backupSecurityService`, `backupRepo`, `guildRepo` e `settingsService` dentro do objeto `services` do `WebPanelService`. Anteriormente, ao salvar ou criar snapshots/backups de servidor (`saveModule('backup')`), o painel disparava `Error: Serviço de backups indisponível.`.
  - **Prevenção de Falhas de Chave Estrangeira em Bancos SQLite (`src/services/webPanelService.js`):** Implementada garantia automática de registro de servidores na tabela `guilds` em `verifyGuildAccess`. Agora, qualquer requisição de configuração (`settings`, `tickets`, `welcome`, `autorole`, `music`) para servidores recém-adicionados ou servidores locais cria automaticamente o registro mestre na tabela `guilds`, eliminando o erro `FOREIGN KEY constraint failed`.
  - **Suporte ao Payload de Anti-Bot Scam (`src/services/webPanelService.js`):** Adicionada captura e persistência de `updates.antiBotScam` no módulo de moderação, salvando adequadamente as regras de bloqueio contra bots maliciosos (MrBeast, links falsos, airdrops) com ação punitiva e duração configuradas.
  - **Transparência e Tratamento de Erros no Servidor HTTP (`src/web/server.js`):** Atualizado o capturador global de exceções da API para retornar a mensagem de erro específica (`err.message`) e logar o stack trace em erros 500, eliminando toasts opacos com mensagens genéricas de "Erro interno do servidor.".


## [7.3.0] - 2026-11-18

### Corrigido
- **Correção de Escopo de Importação no Bootstrap (`src/index.js`):**
  - Importação do módulo `botConfig` promovida para o escopo global no topo de `src/index.js`, sanando o `ReferenceError: botConfig is not defined` que ocorria na inicialização do `bootstrap()` ao registrar o listener de sincronização dinâmica `botConfig.onConfigChange`.

## [7.2.0] - 2026-11-18

### Corrigido
- **Correção Definitiva de Salvamento & Sincronização de Presença & Status no Discord:**
  - Corrigido o envio de status `Custom` em `src/utils/presenceHelper.js`: assegurado que o nome da atividade seja mantido fielmente junto ao `state` (`activityObj.name = activityName; activityObj.state = activityName;`), garantindo que tanto versões antigas quanto o Gateway v10 do Discord reflitam a mensagem instantaneamente sem ficar preso em status residuais.
  - Sincronização em tempo real de prefixo e nome de exibição no `updateGuildSettings` (`src/services/webPanelService.js`), persistindo o prefixo do servidor diretamente nas configurações (`settingsService.setSetting(guildId, 'prefix', cleanPrefix)`).
  - Listener dinâmico em `botConfig.onConfigChange` no boot (`src/index.js`) e no endpoint `POST /api/bot/config` (`src/web/server.js`) para atualizar em tempo real o prefixo do `prefixCommandHandler` e o nome da IA sem requerer reinicialização do processo.

### Adicionado
- **Aba Dedicada "Alertas Sociais" no Painel Web (`tab-alerts`):**
  - Criação de aba exclusiva e isolada no menu lateral para gerenciamento de alertas (YouTube, Twitch e Reddit).
  - Formulário completo para adicionar monitoramento (plataforma, canal/subreddit alvo, canal de destino no Discord, mensagem personalizada com placeholders).
  - Tabela dinâmica de alertas ativos com suporte a disparo de teste em tempo real (`🔔 Testar`) e exclusão em 1 clique (`🗑️ Excluir`).
- **Painel de Configuração Rápida Anti-Bot Scam na Web (`tab-moderation`):**
  - Cartão dedicado com controles simplificados para proteção contra golpes automatizados (MrBeast, Nitro falso, phishings de airdrop e Steam).
  - Seletores para Ativação/Desativação, Ação Punitiva Imediata (`TIMEOUT`, `KICK`, `BAN`) e Duração do Silenciamento (5min a 7 dias).
- **Ferramenta Interativa de Resumo Inteligente do Chat no Painel Web:**
  - Gerador de resumos em tempo real direto pela interface web com suporte a até 300 mensagens recentes por canal.
  - Modos configuráveis: Resumo Estruturado & Factual ou Boletim de Fofoca & Resenha Humorística.
  - Opção de publicar o resumo gerado diretamente no canal do Discord com um clique e botão para cópia instantânea para a área de transferência.
- **Botões de Salvamento Rápido em Cartões Individuais nas Configurações Gerais:**
  - Botão `💾 Salvar Identidade & Prefixo` no cartão "Identidade do Bot no Discord".
  - Botão `💾 Salvar Personalidade & Diretrizes` no cartão "Personalidade & Diretrizes da IA".
  - Botão `💾 Salvar Cores & Tema do Painel` no cartão "Cores & Tema Visual".
- **Cartão de Backups Estruturais de Servidor na Web:**
  - Seção para criação de snapshots de servidor (canais, categorias, cargos e permissões) e visualização de snapshots anteriores com opção de exclusão.

## [7.1.0] - 2026-11-18

### Adicionado
- **Temas Visuais de Painel das IAs de Tony Stark:**
  - Presets estilizados e batizados literalmente com os nomes das IAs de Tony Stark: `jarvis` (Ciano Arc Reactor), `friday` (Verde Esmeralda Cibernético), `veronica` (Vermelho & Dourado Hulkbuster), `edith` (Azul Tático), `karen` (Âmbar Mark XLVII) e `jocasta` (Violeta Titânio).
  - Seleção em 1 clique na interface do painel web com suporte a retrocompatibilidade de aliases antigos.
- **Proteção Avançada Anti-Bot & Anti-Scam:**
  - Detecção heurística de golpes, malwares, airdrops e links de phishing comuns disseminados por bots comprometidos (ex: falsos brindes do MrBeast, geradores de Discord Nitro, roubo de inventário Steam, airdrops cripto falsos e phishing de token).
  - Ação punitiva configurável por servidor (`TIMEOUT`, `KICK` ou `BAN`) com exclusão imediata da mensagem fraudulenta e emissão de alerta no canal de auditoria.
  - Interceptação de mensagens de bots antes do descarte padrão de automações para assegurar que bots comprometidos não disseminem links maliciosos.
- **Sistema Multicanal de Alertas Sociais (YouTube, Reddit e Twitch):**
  - Módulo nativo `SocialAlertService` com varredura automática a cada 5 minutos via RSS (YouTube) e endpoints públicos (Reddit e Twitch).
  - Suporte completo a tags e templates customizáveis (`{title}`, `{url}`, `{author}`, `{platform}`).
  - Comandos slash (`/alerta adicionar`, `listar`, `remover`, `testar`) e comandos prefixo (`+alerta add`, `+alerta list`, `+alerta del`, `+alerta test`).
  - Suporte nativo e endpoints no Painel Web (`/api/guilds/:guildId/modules/social_alerts`).
- **Resumo Inteligente e Estruturado do Chat (Até 300 Mensagens):**
  - Aumento da capacidade de análise de histórico de 40 para até 300 mensagens em lotes paginados contínuos (`limit: 100`, `before: lastId`) sem perda de tempo de resposta.
  - Geração de resumos factuais e estruturados (Tópicos Principais, Participantes & Linhas de Pensamento, Conclusões & Desfechos), desacoplados do boletim humorístico de fofoca.
  - Novo comando slash `/resumo` com opções `tipo` (Resumo ou Fofoca) e `quantidade` (20 a 300 mensagens), além dos comandos prefixo `+resumo`, `+resumir` e `+resumodia`.
  - Atualização da ferramenta de IA `resumir_conversa` em `fridayTools.js` para analisar diretamente as mensagens em tempo real do canal do Discord.
- **Central e Utilitários de Backup do Servidor:**
  - Suporte a backup estrutural de servidores (cargos, canais, categorias e permissões com validação criptográfica SHA-256) via `+backup server`, `+backup criar`, `+backup listar` e `+backup info`.
  - Download direto do arquivo SQLite mantido com `+backup` / `+backup banco`.

### Otimizações & Desempenho
- **Aceleração Global de Tempo de Resposta:**
  - Hoisting e eliminação de `require()` dinâmicos em manipuladores críticos de mensagens (`messageCreate.js`).
  - Memoização com cache de expressões regulares de gatilhos de nome (`getNameRegexes`), evitando compilação repetitiva de RegExp a cada mensagem recebida.
  - Uso de timers não-bloqueantes (`unref()`) em serviços de segundo plano para garantir encerramento gracioso e determinístico.
- **Correção Definitiva de Status Customizado do Bot (Discord Presence):**
  - Ajuste na montagem do payload de presença para `ActivityType.Custom` de acordo com o Gateway v10 do Discord, mantendo `name: 'Custom Status'` e passando o texto na propriedade `state`, permitindo atualização imediata e sem reversões no perfil do bot.

### Testes & Qualidade
- 100% dos testes unitários e de integração aprovados (360 testes passando, 71 suítes, 0 falhas).

## [7.0.0] - 2026-11-18

### Corrigido & Estabilizado
- **Auditoria Geral e Eliminação de Casos Duplicados em Comandos Prefixo:**
  - Descoberto e corrigido conflito de alias onde `case 'p':` no bloco `perfil` sombreava o comando musical `play`/`p`, impedindo a reprodução de faixas com `+p <música>`.
  - Unificação completa das rotas `coinflip`/`cf`/`moeda`/`caraoucoroa` e `dado`/`dice`/`roll`, suportando de forma transparente tanto apostas do sistema de economia/cassino (quando argumentos de quantia são fornecidos) quanto rolagens casuais do módulo social (sem aposta).
  - Remoção dos blocos de caso duplicados no switch de comandos prefixo, garantindo tempo de execução determinístico e sem avisos de código morto.
  - Alinhamento de 100% de paridade entre o registro `KNOWN_COMMANDS` (216 comandos) e o switch de execução `_executeCommand` (216 manipuladores), incluindo os comandos `avaliacoes`, `reviewstats`, `cf` e `abraçar`.
- **Sincronização Total de Módulos no Painel Web (`WebPanelService`):**
  - Implementada simetria absoluta entre leitura (`getModuleConfig`) e gravação (`updateModuleConfig`) para todos os módulos do painel: `warns`, `social`, `marriage`, `quiz`, `xp_reward`, `xp_multiplier` e `ai_keys`.
  - Eliminação de exceções `ValidationError: Módulo desconhecido` em requisições de consulta de configurações de moderação e módulos auxiliares via API.
- **Validação de Estabilidade 100%:**
  - Verificação sintática e de importações de todos os 194 arquivos JavaScript em `src/` (0 erros).
  - Verificação e instanciação em memória de todas as 31 migrações SQLite e todos os 24 repositórios.
  - Verificação e carga de todos os 81 comandos slash, 16 manipuladores de eventos e 45 ferramentas de IA.
  - Execução completa da suíte de testes com 100% de aprovação (360 testes passando, 71 suítes, 0 falhas).

## [6.5.0] - 2026-11-18

### Corrigido
- **Remoção Definitiva da Função Residual de Presença nas Configurações Gerais:**
  - Removido o manipulador residual de atualização de presença no endpoint `POST /api/bot/config`, garantindo que salvar o nome, prefixo ou cores nas Configurações Gerais nunca mais afete ou reverta o status do bot no Discord.
  - Exclusão do objeto `presence` do modelo padrão de `bot_config.json` e `DEFAULT_CONFIG`, centralizando 100% o controle de status e presença exclusivamente na aba "Identidade & Presença" (`bot_presence_configs` no SQLite).
  - Reconciliação no boot (`ready.js`) simplificada para consultar estritamente o banco SQLite como fonte única de verdade, impedindo contaminação por status antigos.

## [6.4.0] - 2026-11-18

### Corrigido
- **Sincronização em Tempo Real de Presença & Status no Discord:**
  - Correção da sincronização em tempo real entre o Painel Web e o cliente Discord ao alterar status e atividade (online, ausente, dnd, invisível e personalizado).
  - Envio explícito do campo `state` exigido pelo Discord Gateway v10 para exibição correta de status personalizados (`ActivityType.Custom`) em contas de bot.
  - Sincronização bidirecional atômica entre a tabela SQLite (`bot_presence_configs`) e o arquivo de configuração `data/bot_config.json`.
  - Reconciliação inteligente no startup (`ready.js`): impede que configurações antigas ou estáticas de `bot_config.json` revertam os status salvos no painel.
  - Vinculação garantida do cliente Discord no `WebPanelService` (`setBotClient`).
  - Suporte ao endpoint `GET /api/guilds/:guildId/modules/bot_presence` e método `savePresence` no repositório.

## [6.3.0] - 2026-11-18

### Adicionado
- **Boletim de Fofocas IA (`+fofoca` / `/fofoca`):** Geração humorística e contextual de acontecimentos recentes do chat sem menções invasivas.
- **Galeria de Emblemas & Conquistas (`+emblemas` / `/emblemas`):** Conquistas desbloqueáveis para membros (Pioneiro, Veterano, Magnata, Apostador, etc.).
- **Bolão de Apostas do Servidor (`+bolao` / `/bolao`):** Criação de previsões e apostas coletivas com distribuição automática de prêmios.
- **Modos de Humor da IA (`+modo` / `/modo`):** Alternância instantânea de personalidade da IA entre Normal, Sarcástico, Debochado e Sério.
- **Backup em 1 Clique no Painel Web:** Criação, download e download direto de snapshots SQLite seguros pelo navegador.

## [6.2.0] - 2026-11-17

### Corrigido
- Separação da aba de configurações gerais e identidade visual da IA no painel web.
- Aliases bilíngues em português para comandos moderativos e utilitários.

## [6.0.0] - 2026-11-17

### Adicionado
- **Motor White-Label 100% Customizável (Nova Aba "Configurações do Bot"):**
  - Personalização dinâmica da identidade do bot: nome oficial, prefixo de comandos, gatilhos de chat e presença/atividade no Discord (jogando, ouvindo, assistindo, transmitindo).
  - Personalização total da IA e System Prompt: papel principal, tom de voz, saudações, diretrizes de comportamento e controle de temperatura.
  - Suporte ao modelo oficial **Gemini 3.5 Flash Lite** como padrão ultrarrápido com failover automático e tool calls nativas.
  - Paleta de cores do painel personalizável via CSS variables dinâmicas com 6 color pickers e 6 presets prontos em 1 clique (Stark Violet, Midas Gold, Crimson Iron, Matrix Emerald, Deep Ocean, Midnight Purple).
  - Estilização universal dos Embeds do Discord (cores de destaque, sucesso, aviso, erro e rodapé personalizado).
  - Gestão de Feature Flags para ativar/desativar subsistemas inteiros (IA, Música, Economia, XP, Moderação, Tickets, Quiz).
  - Persistência e auto-recuperação de configurações via `data/bot_config.json` e rotas `/api/bot/config`.
  - Controles centrais de contraste visual (Modo Escuro / Modo Claro) e idioma do painel (travado por padrão 100% em Português).
- **Empresas (+empresa) reformuladas:** preço escalável anti-monopólio, níveis corporativos com exigência de faturamento, funcionários NPC, gerente de suprimentos automático e botões interativos.
- **Estoque dinâmico por tipo de empresa:** cada negócio consome o próprio insumo (nome, emoji, consumo/hora e custo por unidade configuráveis; custo automático em ~30% da renda). Campos novos no painel web.
- **Sistema de falência:** empresa sem estoque entra em alerta com prazo de 24h (DMs de aviso e último aviso); o dono também pode usar `+empresa falir`. Dívidas com fornecedores, ban de 3 dias para fundar/assumir empresas e demissão dos funcionários humanos.
- **Compra automática pelo bot:** o administrador NPC compra a empresa falida, mantém o estoque e a recoloca à venda (`+empresa leilao`, `+empresa assumir`) com valorização diária até o valor contábil.
- Worker de verificação de falências a cada 10 minutos e migrações 026 a 029.
- Câmbio e Bolsa Stark com ciclo diário automático e suporte a emojis do servidor em todo o painel.

### Corrigido
- Formatação e espaçamento do seletor de "Servidor Conectado" no cabeçalho superior do painel web.
- Correção de fundo branco em menus suspensos nativos do navegador (`select option` / `color-scheme: dark`) e seleção de texto (`::selection`).
- Tradução de todos os termos residuais da interface web para Português (Brasil).
- Salvamento do painel web (CSRF, cabeçalhos e servidor inicial) nos 14 módulos.
- Renderização de emojis customizados do Discord (`<:nome:id>`) e glifos quebrados nas tabelas do painel.

## [1.0.0] - 2026-11-12

### Adicionado
- **Integração Final do Sistema & Testes Ponta a Ponta (E2E):**
  - `tests/finalIntegrationEndToEnd.test.js`:
    - Validação de jornada completa do usuário cruzando todos os subsistemas: Entrada com AutoRole (`CommunityService`), progressão de XP (`ExperienceService`), trabalho e depósito na economia (`EconomyService`), ciclo de atendimento via ticket privado com geração de transcript (`TicketService`), submissão e resposta de avaliação com cálculo de satisfação (`ReviewService`), alteração de configurações e identidade da IA via painel web autenticado (`WebPanelService`), e criação e validação de integridade por checksum SHA-256 de backup estrutural do servidor (`BackupSecurityService`).
    - Teste de estresse e concorrência: 10 transferências financeiras simultâneas concorrentes com locks transacionais atômicos no SQLite, garantindo integridade estrita e impedindo duplicações ou saldos negativos.
    - Teste de isolamento multi-tenant estrito: garantia absoluta de que dados de economia, XP, configurações e nomes da IA de um servidor não vazam para outros servidores.
- **Observabilidade, Métricas de Processo & Saúde:**
  - `tests/healthAndObservability.test.js`:
    - Endpoint `/health` operacional no servidor web nativo informando status global, tempo de atividade (uptime), consumo de memória (`heapUsed`, `heapTotal`, `rss`) e estado da conexão SQLite.
    - Registro de logs contextuais estruturados em JSON (`src/utils/logger.js`) com níveis `INFO`, `WARN` e `ERROR`.
    - Resiliência e reconexão do `DatabaseManager` (`src/database/connection.js`) com novo método `isConnected()`.
- **Auditoria de Segurança & Qualidade:**
  - Auditoria de dependências via `npm audit` com **0 vulnerabilidades**.
  - Higienização e validação completa do arquivo `.env.example`.
  - Verificação de mitigação contra SSRF, Prompt Injection, CSRF e XSS.
- **Suíte de Testes Automatizados:**
  - Total geral consolidado em **164 testes automatizados em 38 suítes com 100% de aprovação**.
- **Lançamento Oficial:**
  - Versão promovida para `1.0.0` com todos os 10 módulos integrados e operacionais.

## [0.9.0] - 2026-11-12

### Adicionado
- **Painel Web de Controle com Autenticação OAuth2 e Segurança Rigorosa:**
  - `WebServer` (`src/web/server.js`): Servidor HTTP nativo e performático baseado em `node:http`.
  - Cabeçalhos de segurança ativados por padrão: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, e `Content-Security-Policy`.
  - Proteção anti-CSRF com tokens criptográficos vinculados à sessão (`X-CSRF-Token`).
  - Rate limiting nativo por IP para prevenção de abuso e ataques DoS.
  - Endpoints REST de gerenciamento sob `/api/guilds`:
    - Listagem estrita de servidores onde o usuário possui permissão `ManageGuild` ou `Administrator`.
    - Bloqueio imediato (403 Forbidden) para tentativas de acesso a servidores alheios ou não autorizados.
    - Sincronização direta e bidirecional com a mesma camada de DAL e serviços compartilhada pelos comandos do Discord.
    - Alteração dinâmica da identidade da IA (`ai_display_name`) e parâmetros dos módulos de tickets, boas-vindas, moderação, economia e automações.
  - Interface visual responsiva e acessível (`src/web/dashboardHtml.js`).
- **Painel Interativo de Configuração Dentro do Discord (`/config`):**
  - Menu interativo com `StringSelectMenuBuilder` permitindo alternar entre módulos (`Identidade`, `Tickets`, `Boas-Vindas`, `Starboard`, `Briefing`).
  - Botões para renomear assistente, restaurar nome padrão para "Cell" e atualizar painel.
  - Modais interativos (`ModalBuilder` e `TextInputBuilder`) para atualização de valores diretamente no cliente Discord com respostas efêmeras.
- **Automações, Agendador & Produtividade da FRIDAY:**
  - `AutomationService` (`src/services/automationService.js`) & `AutomationRepository`:
    - Tarefas e lembretes agendados com suporte a entrega em canal público ou DM privada.
    - Agendador inteligente com timer não-bloqueante (`.unref()`), processamento em lote e garantia de não-duplicação (`status = 'COMPLETED'`).
    - Suporte a recorrências automáticas (`DAILY`, `WEEKLY`, `MONTHLY`).
    - Persistência garantida no SQLite: tarefas sobrevivem a reinicializações do bot e são retomadas pontualmente.
    - Sistema de Missões de Equipe (*Team Quests*) com etapas sequenciais, checklist e cálculo de progresso em porcentagem (0-100%).
    - Relatórios Executivos consolidando estatísticas de múltiplos módulos (membros, tickets, notas, economia e automações).
    - Proteção SSRF: bloqueio contra requisições maliciosas a `localhost`, IPs privados (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), metadados de nuvem (`169.254.0.0/16`) e protocolos não-HTTP.
    - Calculadora matemática segura (sem `eval`) e conversor de unidades (temperatura, distância, armazenamento digital).
- **Banco de Dados (Migração 009):**
  - Migração `009_web_panels_automations.sql` criando: `web_sessions`, `automation_tasks`, `automation_missions`, `automation_mission_steps` e `automation_briefing_configs`.
  - Novos Repositórios DAL: `WebSessionRepository` e `AutomationRepository`.
- **Expansão do Catálogo de Ferramentas da FRIDAY (Total: 58 Ferramentas de IA):**
  - `agendar_lembrete`, `criar_tarefa_servidor`, `consultar_tarefas_pendentes`, `concluir_tarefa`, `gerar_briefing_servidor`, `utilitario_calculo_conversao`, `analisar_seguranca_url`.
- **Novos Comandos Slash (5 Novos Comandos — Total: 69 Comandos Registrados):**
  - `/config`: Painel Discord interativo com Select Menus, Botões e Modais.
  - `/lembrete <segundos> <mensagem> [canal]`: Agenda lembretes pontuais.
  - `/tarefa [criar|listar|concluir|cancelar]`: Gerencia tarefas e missões.
  - `/briefing`: Gera relatório executivo consolidado.
  - `/utilitario [calcular|converter|json]`: Utilitários de produtividade.
- **Suíte de Testes Automatizados (Etapa 9):**
  - `tests/webPanelAuth.test.js`: Sessões OAuth2, CSRF, isolamento entre servidores e endpoints REST.
  - `tests/discordConfigPanel.test.js`: Painel `/config`, botões, modais e sincronização com banco.
  - `tests/automationsScheduler.test.js`: Tarefas, agendador, prevenção de duplicação, persistência e missões.
  - `tests/productivitySecurity.test.js`: Proteção SSRF, cálculo seguro, conversão e ferramentas de IA.
  - Total geral elevado para **158 testes automatizados em 36 suítes com 100% de aprovação**.

## [0.8.0] - 2026-11-12

### Adicionado
- **Módulo de Suporte e Atendimento por Tickets (estilo Ticket Tool):**
  - `TicketService` (`src/services/ticketService.js`):
    - Criação de canais privados de atendimento com permissões restritas (apenas o autor, equipe de suporte e Cell possuem acesso, `@everyone` bloqueado).
    - Enforçamento de limite máximo de tickets abertos simultâneos por membro (`maxOpenTicketsPerUser`).
    - Atribuição de atendimento (`claimTicket`) com prevenção de disputas e registro de atendente responsável.
    - Fechamento com motivo, geração automatizada de transcripts com histórico formatado das mensagens e reabertura de tickets arquivados.
    - Painéis interativos com botões integrados no Discord (`ticket_claim_*`, `ticket_close_*`, `ticket_transcript_*`, `ticket_open_panel_*`).
    - Canal central de logs e transcripts configurável por servidor.
- **Módulo de Avaliações e Reputação da Equipe (estilo ReviewCord):**
  - `ReviewService` (`src/services/reviewService.js`):
    - Submissão de avaliações de 1 a 5 estrelas (`⭐`) com validação de comprimento de comentário e vínculo opcional a atendente e ticket.
    - Fila de moderação para novas avaliações (`PENDING` / `APPROVED` / `DELETED`) com aprovação prévia opcional.
    - Resposta oficial de equipe às avaliações dos usuários (`respondReview`).
    - Estatísticas completas de satisfação e reputação (`getStats`): total de avaliações, nota média ponderada e distribuição detalhada por quantidade de estrelas, filtrável por atendente ou geral do servidor.
- **Módulo de Ferramentas de Comunidade (estilo Loritta):**
  - `CommunityService` (`src/services/communityService.js`):
    - Sistema de Boas-Vindas e Despedidas com template dinâmico (`{user}`, `{username}`, `{server}`, `{members}`).
    - Sistema de AutoRole para atribuição instantânea de cargos na entrada de novos membros (`guildMemberAdd`).
    - Sistema de Sugestões comunitárias com votação de upvotes/downvotes e moderação com justificativa (`APPROVED`, `REJECTED`, `CONSIDERED`).
    - Mural dos Melhores Momentos (Starboard) disparado via reações de estrelas (`⭐`/`🌟`), com contagem dinâmica, criação e atualização de posts no canal de destaques (`messageReactionAdd`).
- **Banco de Dados (Migração 008):**
  - Migração `008_tickets_reviews_community.sql` criando as tabelas: `ticket_panels`, `ticket_categories`, `tickets`, `ticket_guild_configs`, `community_reviews`, `review_guild_configs`, `community_welcome_configs`, `community_autoroles`, `community_suggestions`, `community_starboards` e `community_starred_messages`.
  - Novos Repositórios DAL: `TicketRepository`, `ReviewRepository` e `CommunityRepository`.
- **Expansão do Catálogo de Ferramentas da FRIDAY (Total: 51 Ferramentas de IA):**
  - `consultar_tickets_servidor`, `gerenciar_ticket`, `consultar_estatisticas_avaliacoes`, `moderar_sugestao`, `configurar_boas_vindas`.
- **Novos Comandos Slash (8 Novos Comandos — Total: 64 Comandos Registrados):**
  - Tickets: `/ticket [abrir|fechar|assumir|reabrir|painel|config]`.
  - Avaliações: `/avaliar`, `/avaliacoes`, `/responder-avaliacao`.
  - Comunidade: `/config-boas-vindas`, `/autorole`, `/sugestao`, `/starboard`.
- **Event Listeners Adicionados:**
  - `guildMemberAdd.js`: Boas-vindas e AutoRole.
  - `guildMemberRemove.js`: Despedidas.
  - `messageReactionAdd.js`: Detecção de estrelas do Starboard.
  - Suporte completo a botões de interação de tickets em `interactionCreate.js`.
- **Suíte de Testes Automatizados (Etapa 8):**
  - `tests/tickets.test.js`: Criação de tickets, canais privados, limites por usuário, claim, encerramento, transcripts e reabertura.
  - `tests/reviews.test.js`: Envio de avaliações, moderação, respostas oficiais e cálculo estatístico.
  - `tests/communityFeatures.test.js`: Template de boas-vindas, AutoRole, sugestões e Starboard.
  - `tests/communityTools.test.js`: Execução das 5 ferramentas de IA comunitárias.
  - Total geral elevado para **138 testes automatizados em 32 suítes com 100% de aprovação**.

## [0.7.0] - 2026-11-12

### Adicionado
- **Módulo de Música e Áudio (estilo Jockie Music):**
  - `MusicService` (`src/services/musicService.js`) com gerenciamento de sessões isoladas por servidor (`GuildMusicSession`).
  - Máquina de estados com suporte a `IDLE`, `BUFFERING`, `PLAYING`, `PAUSED` e `DISCONNECTED`.
  - Fila de reprodução com limite máximo configurável (`max_queue_size`), modos de repetição (`OFF`, `TRACK`, `QUEUE`), controle de volume (0-100%) e embaralhamento (`shuffle`).
  - Presets de rádios públicas 24/7 seguras (Lofi, Jazz, Synthwave, Classical), suporte a fluxos HTTP diretos e motor de decodificação FFmpeg nativo via `ffmpeg-static`, Opus via `opusscript` e criptografia via `libsodium-wrappers`.
  - Verificação de permissões de DJ com bypass para administradores.
- **Módulo de Voz com IA e Síntese de Fala (estilo FRIDAY):**
  - Síntese de fala em tempo real (TTS) com `/falar` e ferramenta de IA `falar_canal_voz`.
  - Políticas estritas de privacidade: sem gravação ou transcrição sem consentimento prévio.
- **Módulo Social, Namoro e Minigames (estilo Loritta):**
  - `SocialFunService` (`src/services/socialFunService.js`):
    - Ações sociais com mensagens dinâmicas e GIFs seguros (`abracar`, `beijar`, `cumprimentar`, `socar`, `chutar`, `zoar`, `flertar`, `cafune`, `dancar`).
    - Sistema de namoro e casamento no banco de dados (`social_marriages`), com certidão de união, tempo juntos em dias/horas, divórcio e pedidos interativos com botões Discord.js.
    - Termômetro de afinidade (`/shippar`) com algoritmo determinístico e barra visual.
    - Minigames: `/moeda` (Cara ou Coroa), `/dado` (rolagem de 2 a 1000 lados), `/8ball` (respostas oraculares), `/sorteio` e `/enquete`.
- **Banco de Dados (Migração 007):**
  - Migração `007_music_voice_fun.sql` criando as tabelas `music_guild_configs`, `social_marriages` e `social_guild_configs`.
  - Repositório DAL `MusicVoiceRepository` (`src/database/repositories/musicVoiceRepository.js`).
- **Expansão do Catálogo de Ferramentas da FRIDAY (Total: 46 Ferramentas):**
  - `conectar_canal_voz`, `desconectar_canal_voz`, `tocar_musica`, `controlar_musica`, `consultar_fila_musica`, `falar_canal_voz`, `executar_interacao_social`.
- **Novos Comandos Slash (24 Novos Comandos — Total: 56 Comandos):**
  - Música: `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/fila`, `/tocando`, `/volume`, `/loop`, `/shuffle`, `/conectar`, `/desconectar`, `/falar`, `/config-musica`.
  - Social: `/interacao`, `/shippar`, `/casar`, `/divorciar`, `/relacionamento`, `/dado`, `/moeda`, `/8ball`, `/sorteio`, `/enquete`.
- **Suíte de Testes Automatizados (Etapa 7):**
  - `tests/musicPlayer.test.js`: Estados do player, filas, loop, volume, limites e isolamento entre servidores.
  - `tests/voiceSession.test.js`: Conexões de canal de voz, permissões de DJ e síntese TTS.
  - `tests/socialFun.test.js`: Interações sociais, shipping, casamentos e minigames.
  - `tests/musicVoiceTools.test.js`: Ferramentas de IA para controle musical, voz e entretenimento.
  - Total geral elevado para **113 testes automatizados em 28 suítes com 100% de aprovação**.

## [0.6.0] - 2026-11-12

### Adicionado
- **Módulo de Economia Completa estilo UnbelievaBoat:**
  - `EconomyService` (`src/services/economyService.js`):
    - Sistema financeiro com carteira (*wallet*) e banco (*bank*) com limite de capacidade configurável.
    - Operações bancárias atômicas (`deposit`, `withdraw`, `transfer`) protegidas por transações SQLite.
    - Atividades de renda com cooldowns individuais e mensagens contextuais: `/work`, `/daily`, `/weekly`, `/crime`, `/slut`.
    - Mecânica de assalto (`/rob`) com cálculo de probabilidade (45%), verificação de saldos mínimos da vítima e assaltante, e compensação em caso de flagrante.
    - Jogos virtuais de azar (`/apostar`): Coinflip (2x), Dice 1 a 6 (6x), Caça-Níqueis/Slots com cilindros animados e Jackpot (5x / 1.5x), e Aposta Geral (50/50).
    - Loja comunitária com catálogo de itens, rastreamento de estoque, concessão automática de cargos Discord (`roles.add`) e revenda de itens por 50% do valor de tabela.
    - Inventário de membros (`getUserInventory`).
    - Painel administrativo para ajustes de saldo (`add`, `remove`, `set`), reset de economia (por membro ou servidor) e customização de moeda por guilda.
- **Banco de Dados (Migração 006):**
  - Migração `006_economy_system.sql` criando as tabelas `economy_accounts`, `economy_transactions`, `economy_cooldowns`, `economy_shop_items`, `economy_inventory` e `economy_guild_configs`.
  - Repositório DAL `EconomyRepository` (`src/database/repositories/economyRepository.js`) com persistência, consultas de saldo, livro-razão e rankings.
- **Expansão do Catálogo de Ferramentas da FRIDAY (Total: 39 Ferramentas):**
  - Ferramentas de saldo, transferência, administração, loja e ranking.
- **15 Comandos Slash de Economia.**
- **Suíte de Testes Automatizados (Etapa 6):** 94 testes em 24 suítes.

## [0.5.0] - 2026-11-12

### Adicionado
- Sistema de Experiência (XP), Níveis e Progressão (`ProgressionFormulaService`, `ExperienceService`).
- Banco de Dados (Migração 005): `guild_member_xp`, `xp_level_rewards`, `xp_multipliers_exemptions`, `xp_guild_configs`.
- Comandos Slash: `/rank`, `/leaderboard`, `/xp-admin`, `/config-xp`.
- 65 testes automatizados em 18 suítes.

## [0.4.0] - 2026-11-12

### Adicionado
- Moderação Disciplinar & Punições (`ModerationService`, `WarnEscalationService`, `ProtectionService`, `LogDispatchService`).
- Banco de Dados (Migração 004): `moderation_punishments`, `warn_escalation_rules`, `moderation_log_channels`, `anti_abuse_configs`.
- Comandos Slash: `/punir`, `/historico-membro`, `/limpar-mensagens`, `/config-mod`.

## [0.3.0] - 2026-11-12

### Adicionado
- Administração de Servidor, Hierarquia e Segurança (`HierarchyService`, `ServerAdminService`, `BackupSecurityService`, `LockdownService`).
- Banco de Dados (Migração 003): `guild_backups`, `protected_resources`, `lockdown_states`.
- Comandos Slash: `/cargo`, `/canal`, `/lockdown`, `/backup`, `/auditar`.

## [0.2.0] - 2026-11-12

### Adicionado
- Núcleo de Inteligência Artificial com adaptador agnóstico e integração Google Gemini (`gemini-2.5-flash`).
- Sistema de memória persistente e defesa contra prompt injection.
- Comandos Slash: `/ai-status`, `/ai-nome`, `/memoria`.

## [0.1.0] - 2026-11-12

### Adicionado
- Fundação técnica modular do bot unificado em Discord.js e Node.js.
- Conexão SQLite nativa (`node:sqlite`) em modo WAL com migrações versionadas.
- DAL e logger estruturado.
