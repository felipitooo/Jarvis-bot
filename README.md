# J.A.R.V.I.S. — Plataforma Unificada para Discord (Versão 9.4.0 — Isolamento Completo de Auditoria Multi-Bot, Resolução de Conflitos e Overview Isolado no Painel)

O **J.A.R.V.I.S.** é uma plataforma modular de alta performance para Discord construída com Node.js (v22+), Discord.js v14 e SQLite nativo (`node:sqlite`). Ele unifica recursos avançados de Inteligência Artificial (Google Gemini 3.5), Sistema de Banimento Temporário (TempBan), Central de 26 Módulos com gating real, Multi-Bot Manager, leitura segura de arquivos (ZIP/RAR/JAR/DOCX/XLSX), moderação automática, economia, cassino, música, tickets, reviews e painel web completo.

---

## 1. Identidade Global da IA

- **Nome Padrão Inicial:** `Jarvis`
- **Identificador Técnico Interno:** `jarvis-unified-core` (completamente desacoplado do nome de exibição).
- **Personalização Dinâmica:** Cada servidor possui sua própria chave de configuração `ai_display_name` no banco de dados.
- **Configuração Multi-Canal:** O nome pode ser consultado, alterado ou restaurado dinamicamente via:
  1. **Painel Web:** Interface REST/HTML com validação CSRF (`/api/guilds/:id/settings`).
  2. **Painel Discord (`/config`):** Botões e modais interativos.
  3. **Comando Slash:** `/ai-nome`.
  4. **Ferramentas de IA:** `gerenciar_notas_servidor` / `IdentityService`.
- **Injeção em Prompts:** O prompt de sistema da IA recebe dinamicamente o nome atualizado do servidor (`IdentityService.getDisplayName(guildId)`), sem valores hardcoded no código.

---

## 2. Requisitos de Sistema & Instalação

### Pré-requisitos
- **Node.js:** Versão 22.0.0 ou superior (necessária para suporte ao `node:sqlite` nativo e suíte de testes integrada).
- **Gerenciador de Pacotes:** `npm` (incluso no Node.js).
- **Sistema Operacional:** Linux (Ubuntu 22.04+ / Debian 12 / AlmaLinux), Windows 10/11 ou macOS.
- **FFmpeg & Áudio:** Pacote `ffmpeg-static` incluso nas dependências do projeto.

### Instalação Passo a Passo

```bash
# 1. Clonar o repositório ou navegar até o diretório do projeto
cd c:/Jarvis

# 2. Instalar as dependências de produção
npm install

# 3. Configurar as variáveis de ambiente
cp .env.example .env

# 4. Editar o arquivo .env com suas credenciais do Discord e chaves
# (veja a seção de Variáveis de Ambiente abaixo)

# 5. Executar os testes automatizados para verificar a integridade da instalação
npm test

# 6. Iniciar a aplicação
npm start
```

---

## 3. Guia de Intents e Permissões do Discord

### Intents de Gateway Necessários
No [Discord Developer Portal](https://discord.com/developers/applications):
1. Acesse sua aplicação e selecione a aba **Bot**.
2. Na seção **Privileged Gateway Intents**, habilite:
   - ✅ **Presence Intent** (opcional, recomendado para status).
   - ✅ **Server Members Intent** (essencial para boas-vindas, AutoRole, moderação e contagem).
   - ✅ **Message Content Intent** (essencial para leitura de mensagens de chat, XP e Starboard).

### Permissões Recomendadas para o Bot
Ao gerar o link de convite (OAuth2 > URL Generator > `bot` e `applications.commands`):
- **Administrador** (opção mais simples para servidores privados/equipe interna) OU as seguintes permissões granulares:
  - `Manage Roles` (atribuição de cargos, AutoRole, recompensas de XP e loja).
  - `Manage Channels` (criação e arquivamento de canais de tickets, trancamento em lockdown).
  - `Kick Members` / `Ban Members` / `Moderate Members` (ações punitivas e timeouts).
  - `Send Messages` / `Send Messages in Threads` / `Embed Links` / `Attach Files` / `Read Message History`.
  - `Add Reactions` / `Use External Emojis` (Starboard, enquetes, reações).
  - `Connect` / `Speak` (Música, player de áudio e TTS nos canais de voz).

---

## 4. Variáveis de Ambiente (`.env`)

Copie o `.env.example` para `.env` e preencha:

```ini
# Credenciais do Bot no Discord
DISCORD_TOKEN=seu_bot_token_aqui
CLIENT_ID=seu_client_id_aqui
DISCORD_CLIENT_SECRET=seu_client_secret_aqui
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback

# Ambiente de Execução
NODE_ENV=production

# Servidor Web do Painel
PORT=3000
WEB_HOST=127.0.0.1

# Banco de Dados SQLite
DATABASE_PATH=./data/cell.sqlite

# Nível de Log (debug | info | warn | error)
LOG_LEVEL=info

# Identidade Global Padrão da IA
DEFAULT_AI_NAME=Jarvis

# Configuração da IA Gemini (Opcional - opera em modo simulado seguro caso ausente)
GEMINI_API_KEY=sua_chave_gemini_aqui
GEMINI_MODEL=gemini-1.5-flash
```

---

## 5. Painéis de Controle (Web & Discord)

### Painel Web (`http://127.0.0.1:3000`)
- **Servidor HTTP Nativo:** Baseado em `node:http`, sem gargalos ou dependências pesadas.
- **Segurança Reforçada:** HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.
- **Proteção Anti-CSRF:** Token criptográfico por sessão validado em todas as requisições `POST`/`PATCH`/`DELETE`.
- **Autorização Rigorosa:** Acesso concedido exclusivamente para servidores onde o usuário logado possui permissões `ManageGuild` ou `Administrator`. Tentativas de acesso a servidores alheios são rejeitadas com `403 Forbidden`.
- **Endpoints REST (`/api/guilds`):**
  - `GET /api/guilds`: Lista servidores autorizados.
  - `GET /api/guilds/:id`: Informações detalhadas do servidor e contadores.
  - `PATCH /api/guilds/:id/settings`: Atualização da identidade da IA e parâmetros gerais.
  - `GET/PATCH /api/guilds/:id/modules/:module`: Configuração de `tickets`, `reviews`, `welcome`, `starboard` e `briefing`.
  - `GET /api/guilds/:id/audit`: Registro de auditoria do servidor.
- **Observabilidade:** `GET /health` reporta uptime, uso de memória (RSS/Heap) e status do banco.

### Painel Discord (`/config`)
- **Navegação Interativa:** Menu dropdown com `StringSelectMenuBuilder` alternando entre módulos do servidor.
- **Botões Dinâmicos:** Renomear IA, Restaurar nome padrão para "Jarvis", e atualizar exibição.
- **Modais Nativos:** Entrada de novos valores diretamente no cliente Discord com respostas efêmeras (invisíveis para terceiros).

---

## 6. Automações & Produtividade da FRIDAY

- **Lembretes e Agendamentos:** Suporte a lembretes em canal público ou DM, com recorrências (`DAILY`, `WEEKLY`, `MONTHLY`) e persistência no SQLite.
- **Missões de Equipe (*Team Quests*):** Checklists colaborativos com acompanhamento de progresso em porcentagem (0-100%).
- **Relatórios Executivos (Briefings):** Consolidação analítica do servidor: novos membros, tickets, economia, tarefas e reputação média.
- **Proteção SSRF:** Bloqueio estrito de requisições a `localhost`, IPs privados (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), metadados de nuvem (`169.254.0.0/16`) e esquemas não-HTTP.
- **Cálculo Matemático Seguro:** Parser aritmético próprio sem uso de `eval`.

---

## 7. Módulos e Funcionalidades Integradas

- **Tickets & Atendimento:** Criação de canais privados com permissões restritas, controle de disputa com *claim*, geração automática de transcripts em formato de histórico de mensagens e reabertura.
- **Avaliações & Reputação:** Feedback de 1 a 5 estrelas (`⭐`), moderação de avaliações, resposta oficial de atendentes e cálculo de médias ponderadas.
- **Comunidade:** Mensagens dinâmicas de boas-vindas/despedidas, AutoRole imediato, sistema de sugestões comunitárias com votação e Starboard dinâmico.
- **Música & Voz:** Player multi-guild com filas de reprodução, ajuste de volume (0-100), modos de repetição (`TRACK`/`QUEUE`), shuffle, presets 24/7 e síntese TTS no canal de voz.
- **Economia Completa:** Carteira, banco, limites de capacidade, trabalho (`/work`), recompensas diárias/semanais (`/daily`, `/weekly`), assaltos (`/rob`), crimes (`/crime`), jogos de azar (`/apostar`) e loja com cargos compráveis.
- **Moderação & Segurança:** Advertências (`warns`) com escalonamento automático progressivo (mute, kick, ban), expiração temporal configurável, purga de mensagens e lockdown emergencial de canais.
- **Administração & Backups:** Backups estruturais completos em JSON (cargos, permissões, canais) com validação por checksum SHA-256 e auditoria permanente.

---

## 8. Catálogo Completo de Ferramentas de IA (58 Ferramentas)

| Categoria | Quantidade | Ferramentas | Permissão Exigida |
| :--- | :---: | :--- | :--- |
| **Memória & Notas** | 5 | `salvar_memoria`, `consultar_memoria`, `esquecer_memoria`, `salvar_memoria_servidor`, `gerenciar_notas_servidor` | Variável |
| **Contexto & Utilidades** | 6 | `obter_contexto_canal`, `resumir_conversa`, `traduzir_texto`, `calcular_expressao`, `formatar_e_validar_json`, `gerar_arquivo_anexo` | Livre |
| **Membros & Apelidos** | 4 | `consultar_perfil_membro`, `buscar_membros_servidor`, `gerenciar_cargo_membro`, `alterar_apelido_membro` | `ManageRoles` / `ManageNicknames` |
| **Cargos & Canais** | 6 | `criar_cargo_servidor`, `excluir_cargo_servidor`, `criar_canal_servidor`, `excluir_canal_servidor`, `trancar_ou_destrancar_canal`, `gerenciar_modo_lento_canal` | `ManageRoles` / `ManageChannels` |
| **Auditoria & Estrutura** | 2 | `analisar_servidor`, `auditar_permissoes_servidor` | `ManageGuild` |
| **Moderação Disciplinar** | 5 | `aplicar_punicao_membro`, `consultar_historico_disciplinar`, `limpar_advertencias_membro`, `configurar_regra_escalonamento`, `purgar_mensagens_canal` | `ModerateMembers` / `ManageGuild` |
| **XP & Progressão** | 5 | `consultar_nivel_membro`, `consultar_ranking_servidor`, `gerenciar_xp_membro`, `configurar_bloqueio_xp_canal`, `resetar_xp_servidor` | `ManageGuild` / `Administrator` |
| **Economia Virtual** | 6 | `consultar_saldo_membro`, `transferir_moedas`, `gerenciar_economia_admin`, `consultar_loja_itens`, `comprar_item_loja`, `consultar_ranking_economia` | Variável (`ManageGuild` para admin) |
| **Música & Social** | 7 | `conectar_canal_voz`, `desconectar_canal_voz`, `tocar_musica`, `controlar_musica`, `consultar_fila_musica`, `falar_canal_voz`, `executar_interacao_social` | DJ / Gerenciar Servidor |
| **Tickets & Comunidade** | 5 | `consultar_tickets_servidor`, `gerenciar_ticket`, `consultar_estatisticas_avaliacoes`, `moderar_sugestao`, `configurar_boas_vindas` | `ManageChannels` / `ManageGuild` |
| **Automações & Produtividade** | 7 | `agendar_lembrete`, `criar_tarefa_servidor`, `consultar_tarefas_pendentes`, `concluir_tarefa`, `gerar_briefing_servidor`, `utilitario_calculo_conversao`, `analisar_seguranca_url` | Variável (`ManageGuild` para missões) |

---

## 9. Comandos Slash Registrados (69 Comandos)

- **Fundação & IA:** `/ping`, `/ai-status`, `/ai-nome`, `/memoria`.
- **Painel & Configuração:** `/config` (Painel interativo com select menus, botões e modais).
- **Administração & Segurança:** `/cargo`, `/canal`, `/lockdown`, `/backup`, `/auditar`.
- **Moderação:** `/punir`, `/historico-membro`, `/limpar-mensagens`, `/config-mod`.
- **XP & Níveis:** `/rank`, `/leaderboard`, `/xp-admin`, `/config-xp`.
- **Economia & Banco:** `/saldo`, `/depositar`, `/sacar`, `/transferir`, `/work`, `/daily`, `/weekly`, `/crime`, `/slut`, `/rob`, `/apostar`, `/loja`, `/inventario`, `/eco-admin`, `/ricos`.
- **Música & Voz:** `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/fila`, `/tocando`, `/volume`, `/loop`, `/shuffle`, `/conectar`, `/desconectar`, `/falar`, `/config-musica`.
- **Social & Diversão:** `/interacao`, `/shippar`, `/casar`, `/divorciar`, `/relacionamento`, `/dado`, `/moeda`, `/8ball`, `/sorteio`, `/enquete`.
- **Tickets & Atendimento:** `/ticket [abrir|fechar|assumir|reabrir|painel|config]`.
- **Avaliações & Reputação:** `/avaliar`, `/avaliacoes`, `/responder-avaliacao`.
- **Comunidade:** `/config-boas-vindas`, `/autorole`, `/sugestao`, `/starboard`.
- **Automações & Produtividade:**
  - `/lembrete <segundos> <mensagem> [canal]`: Agenda lembrete pontual ou em DM.
  - `/tarefa [criar|listar|concluir|cancelar]`: Gerencia tarefas e missões da equipe.
  - `/briefing`: Emite relatório executivo analítico do servidor.
  - `/utilitario [calcular|converter|json]`: Ferramentas seguras de cálculo e conversão.

---

## 10. Implantação em Produção & Monitoramento

### 1. Process Manager (PM2)
Recomenda-se gerenciar o processo do bot utilizando o PM2 para reinicialização automática em caso de falha:

```bash
# Instalação global do PM2
npm install -g pm2

# Iniciar o bot com reinício automático e monitoramento
pm2 start src/index.js --name "jarvis-bot" --time

# Salvar a lista de processos para inicialização no boot do sistema
pm2 save
pm2 startup
```

### 2. Configuração de Proxy Reverso (Nginx com SSL)
Para expor com segurança o painel web em um domínio externo com certificado HTTPS (Let's Encrypt):

```nginx
server {
    listen 80;
    server_name painel.seuservidor.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name painel.seuservidor.com;

    ssl_certificate /etc/letsencrypt/live/painel.seuservidor.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/painel.seuservidor.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Monitoramento de Saúde (`/health`)
O servidor expõe nativamente o endpoint `GET /health` para integração com Prometheus, Uptime Kuma ou DataDog:
```json
{
  "status": "healthy",
  "uptimeSeconds": 86420,
  "timestamp": "2026-11-12T23:00:00.000Z",
  "memory": {
    "rssMB": 42.1,
    "heapTotalMB": 28.5,
    "heapUsedMB": 18.2
  },
  "database": {
    "status": "connected"
  }
}
```

---

## 11. Procedimentos de Backup, Restauração & Rollback

### Backup Automatizado do Banco SQLite
O banco de dados SQLite (`./data/cell.sqlite`) pode ser copiado em tempo de execução de forma atômica ou via snapshot diário:
```bash
# Backup manual do arquivo SQLite
sqlite3 ./data/cell.sqlite ".backup './data/backups/cell_$(date +%Y%m%d_%H%M%S).sqlite'"
```

### Restauração de Backup
1. Interrompa o bot: `pm2 stop jarvis-bot`
2. Substitua o banco atual pelo arquivo restaurado: `cp ./data/backups/cell_backup.sqlite ./data/cell.sqlite`
3. Reinicie a aplicação: `pm2 start jarvis-bot`

### Plano de Rollback de Código e Migrações
Em caso de anomalia grave em nova versão:
1. Reverter o código para a tag estável anterior: `git checkout v0.9.0`
2. Instalar dependências da versão anterior: `npm install`
3. Restaurar a cópia de segurança do banco de dados correspondente.
4. Reiniciar o serviço e executar `npm test` para certificar a estabilidade.

---

## 12. Matriz Honesta de Recursos & Limitações

| Módulo / Recurso | Status | Observações / Limitações |
| :--- | :---: | :--- |
| **Identidade Dinâmica da IA** | ✅ **Completo** | O nome inicial é "Jarvis". Totalmente alterável por servidor via painel web, painel Discord ou `/ai-nome`. |
| **Banco de Dados SQLite Nativo** | ✅ **Completo** | Migrações atômicas, isolamento multi-tenant estrito e locks transacionais sem race conditions. |
| **Moderação & Escalonamento** | ✅ **Completo** | Warns com prazos de expiração, punições automáticas e logs centralizados. |
| **XP & Níveis** | ✅ **Completo** | Cooldowns, canais bloqueados, multiplicadores, cargos de recompensa e ranking. |
| **Economia Virtual** | ✅ **Completo** | Carteira, banco, trabalho, crimes, transferências atômicas e loja de cargos. |
| **Tickets & Avaliações** | ✅ **Completo** | Canais com permissões restritas, claim, transcripts formatados e avaliações com médias ponderadas. |
| **Comunidade & Starboard** | ✅ **Completo** | Boas-vindas dinâmicas, AutoRole, sugestões com votação e Starboard por reações. |
| **Painel Web com OAuth2** | ✅ **Completo** | Autenticação via Discord, controle por permissões, CSRF e cabeçalhos de segurança. |
| **Painel Discord (`/config`)** | ✅ **Completo** | Menus de seleção, botões e modais com respostas efêmeras. |
| **Automações & SSRF** | ✅ **Completo** | Agendador resiliente, missões colaborativas, parser matemático seguro e bloqueio de IPs privados. |
| **Player de Música & Voz** | ⚠️ **Parcial** | Fila de reprodução, conexões e TTS operacionais; reprodução de streaming ao vivo de certas plataformas terceiras depende de APIs externas ou links diretos válidos devido a restrições de DRM. |
| **Integração com Gemini API** | ⚠️ **Flexível** | Quando `GEMINI_API_KEY` está ausente, opera em modo simulado seguro sem falhas. Com a chave, utiliza o modelo configurado (`gemini-1.5-flash`). |
| **LordBot & Asura** | ❌ **Fora de Escopo** | Explicitamente excluídos do projeto por definição de especificação. |

---

## 13. Verificação & Testes Automatizados

A suíte de testes do Jarvis é executada nativamente pelo Node.js Test Runner:

```bash
# Executa os 164 testes em 38 suítes
npm test
```

### Resultados Validados:
- **Suítes de Teste:** 38
- **Testes Executados:** 164
- **Aprovações:** 164 (100%)
- **Falhas:** 0
- **Auditoria de Vulnerabilidades (`npm audit`):** 0 vulnerabilidades.
