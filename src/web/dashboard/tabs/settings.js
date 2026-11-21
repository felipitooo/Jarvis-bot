module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-settings" class="tab-content">
      <!-- Header Banner / Resumo -->
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(56, 189, 248, 0.08)); border: 1px solid var(--border-hover);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem;">
              <span>⚙️</span> Personalização Total do Bot & Painel Web
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
              Transforme este projeto na <strong>base customizável (White-Label)</strong> para criar qualquer bot. Modifique a identidade, a persona da IA, as cores do painel, os embeds e os módulos ativos.
            </p>
          </div>
          <div style="display: flex; gap: 0.6rem; align-items: center;">
            <button type="button" class="secondary-btn" id="resetConfigBtn" style="padding: 0.55rem 1rem;">🔄 Restaurar Padrões</button>
            <button type="button" class="primary-btn" id="saveGlobalConfigBtn" style="padding: 0.55rem 1.35rem; font-weight: 700;">💾 Salvar Tudo</button>
          </div>
        </div>
      </div>

      <div id="botConfigTargetBotBanner" style="margin-bottom: 1.25rem; padding: 0.65rem 1rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.88rem; display: flex; align-items: center; justify-content: space-between;">
        <span>⚙️ Editando configurações de: <strong style="color: #38bdf8;">J.A.R.V.I.S. (Principal)</strong> <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4);">Bot Base</span></span>
      </div>

      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">

        <!-- 0. MODO DE EXIBIÇÃO & IDIOMA DO PAINEL -->
        <div class="card" style="grid-column: 1 / -1; background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)); border: 1px solid var(--border-color);">
          <h2 style="display: flex; align-items: center; gap: 8px;">
            <span>🌓</span> Modo de Exibição & Idioma do Painel
          </h2>
          <p>Configure a preferência visual de contraste do painel (Claro ou Escuro) e o idioma da interface.</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-top: 1rem;">
            <!-- Contraste do Painel (Claro / Escuro) -->
            <div id="themeToggleContainer" style="background: rgba(0,0,0,0.22); padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <label style="display: block; font-weight: 700; margin-bottom: 0.6rem; color: var(--text-main); font-size: 0.9rem;">
                Contraste Visual (Tema)
              </label>
              <div id="themeToggleBtn" style="display: flex; gap: 0.6rem;">
                <button type="button" id="cfgThemeDarkBtn" class="secondary-btn" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;">
                  <span>🌙</span> Modo Escuro
                </button>
                <button type="button" id="cfgThemeLightBtn" class="secondary-btn" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;">
                  <span>☀️</span> Modo Claro
                </button>
              </div>
              <small style="display: block; margin-top: 0.5rem; color: var(--text-muted); font-size: 0.76rem;">Alternar entre o tema escuro tradicional e o tema claro.</small>
            </div>

            <!-- Idioma da Interface -->
            <div id="langToggleContainer" style="background: rgba(0,0,0,0.22); padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <label style="display: block; font-weight: 700; margin-bottom: 0.6rem; color: var(--text-main); font-size: 0.9rem;">
                Idioma do Painel
              </label>
              <div id="langToggleBtn" style="display: flex; gap: 0.6rem;">
                <button type="button" id="cfgLangPtBtn" class="secondary-btn" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;">
                  <span>🇧🇷</span> Português (BR)
                </button>
                <button type="button" id="cfgLangEnBtn" class="secondary-btn" style="flex: 1; padding: 0.65rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;">
                  <span>🇺🇸</span> English (US)
                </button>
              </div>
              <small style="display: block; margin-top: 0.5rem; color: var(--text-muted); font-size: 0.76rem;">Defina o idioma principal de todos os textos, botões e abas.</small>
            </div>
          </div>
        </div>

        <!-- 1. IDENTIDADE DO BOT NO DISCORD -->
        <div class="card">
          <h2>🤖 Identidade do Bot no Discord</h2>
          <p>Altere o nome oficial, o prefixo de comandos e como o bot reage no chat.</p>

          <div class="form-group">
            <label>Nome Oficial do Bot (Identidade)</label>
            <input type="text" id="cfgBotName" placeholder="Ex: J.A.R.V.I.S., Midas, Athena">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 0.75rem;">
            <div class="form-group">
              <label>Prefixo de Comandos</label>
              <input type="text" id="cfgBotPrefix" placeholder="Ex: +, !, .">
            </div>
            <div class="form-group">
              <label>Gatilhos de Nome no Chat</label>
              <input type="text" id="cfgTriggerNames" placeholder="Ex: Jarvis, J.A.R.V.I.S">
              <small style="color: var(--text-subtle); font-size: 0.75rem;">Separados por vírgula. Responde sem precisar de @menção.</small>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.5rem;">
            <div class="form-group">
              <label>Status no Discord</label>
              <select id="cfgPresenceStatus">
                <option value="online">🟢 Online</option>
                <option value="idle">🟡 Ausente (Idle)</option>
                <option value="dnd">🔴 Não Perturbe (DND)</option>
                <option value="invisible">⚪ Invisível</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tipo de Atividade</label>
              <select id="cfgPresenceActivityType">
                <option value="Custom">💬 Personalizado</option>
                <option value="Playing">🎮 Jogando</option>
                <option value="Listening">🎧 Ouvindo</option>
                <option value="Watching">📺 Assistindo</option>
                <option value="Competing">🏆 Competindo</option>
                <option value="Streaming">🔴 Transmitindo (Live)</option>
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-top: 0.5rem;">
            <label>Texto da Mensagem de Atividade</label>
            <input type="text" id="cfgPresenceActivityText" placeholder="Ex: Nala | +ajuda">
          </div>

          <button type="button" class="primary-btn" id="saveBotIdentityBtn" style="margin-top: 0.75rem; font-weight: 700;">💾 Salvar Identidade, Prefixo & Status</button>
        </div>

        <!-- 2. PERSONALIDADE DA IA (SYSTEM PROMPT) -->
        <div class="card">
          <h2>🧠 Personalidade & Diretrizes da IA</h2>
          <p>Mude quem a inteligência artificial é. Funciona com Gemini Flash e Pro.</p>

          <div class="form-group">
            <label>Papel Principal (Função / Persona)</label>
            <input type="text" id="cfgAiRole" placeholder="Ex: Inteligência artificial central e assistente pessoal.">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label>Forma de Tratamento</label>
              <input type="text" id="cfgAiSalutation" placeholder="Ex: Senhor / Senhora, Mestre">
            </div>
            <div class="form-group">
              <label>Modelo Gemini Padrão</label>
              <select id="cfgAiModel">
                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Recomendado - Ultrarrápido & Leve)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Alta Performance)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                <option value="gemini-flash-lite-latest">Gemini Flash Lite (Latest)</option>
                <option value="gemini-flash-latest">Gemini Flash (Latest)</option>
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Nova Geração)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Tom de Voz (Estilo)</label>
            <input type="text" id="cfgAiTone" placeholder="Ex: Aristocrático, mordomo inglês, humor seco e refinado.">
          </div>

          <div class="form-group">
            <label>Modo de Humor da IA</label>
            <select id="cfgAiHumorMode">
              <option value="normal">⚖️ Normal / Equilibrado (Paul Bettany / Jarvis Clássico)</option>
              <option value="zoeiro">🤣 Zoeiro & Comediante (Gírias, piadas e zoeira saudável com amigos)</option>
              <option value="sarcastico">😏 Sarcástico & Debochado (Ironia refinada e deboche inteligente)</option>
              <option value="amigavel">💖 Amigável & Acolhedor (Carinhoso, empático e companheiro)</option>
              <option value="sabio">🧙‍♂️ Sábio & Filosófico (Metáforas profundas e reflexões)</option>
              <option value="serio">🤖 Sério & Estritamente Técnico (Focado em dados e sem rodeios)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Diretrizes de Personalidade (Uma por linha)</label>
            <textarea id="cfgAiGuidelines" rows="3" placeholder="Insira as regras de personalidade da IA..."></textarea>
          </div>

          <div class="form-group">
            <label style="display: flex; justify-content: space-between; align-items: center;">
              <span>Temperatura / Criatividade</span>
              <strong id="cfgAiTempDisplay">0.65</strong>
            </label>
            <input type="range" id="cfgAiTemp" min="0" max="1" step="0.05" value="0.65" style="width: 100%;">
          </div>
          <button type="button" class="primary-btn" id="saveBotPersonaBtn" style="margin-top: 0.75rem; font-weight: 700;">💾 Salvar Personalidade & Diretrizes</button>
        </div>

        <!-- 3. TEMA VISUAL DO PAINEL WEB (COLOR PALETTE + PRESETS) -->
        <div class="card" style="grid-column: 1 / -1;">
          <h2 id="cfgHeadingColors">🎨 Cores & Tema Visual do Painel Web</h2>
          <p id="cfgHeadingColorsDesc">Personalize 100% da paleta visual da interface web. As alterações são aplicadas instantaneamente!</p>

          <!-- Presets de Cores em 1 Clique -->
          <div style="margin-bottom: 1.25rem;">
            <label id="cfgHeadingPresets" style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase;">Presets de IAs do Tony Stark (1 Clique)</label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
              <button type="button" class="preset-theme-btn" data-preset="jarvis" style="background: #061528; border: 1px solid #00e5ff; color: #bae6fd; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #00E5FF; display: inline-block;"></span>
                JARVIS (Ciano Arc)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="friday" style="background: #061a14; border: 1px solid #10b981; color: #a7f3d0; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                FRIDAY (Esmeralda Cyber)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="veronica" style="background: #200d11; border: 1px solid #ef4444; color: #fecaca; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #EF4444; display: inline-block;"></span>
                VERONICA (Hulkbuster Crimson)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="edith" style="background: #081d30; border: 1px solid #3b82f6; color: #bae6fd; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #3B82F6; display: inline-block;"></span>
                EDITH (Azul Tático)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="karen" style="background: #1c1917; border: 1px solid #f59e0b; color: #fde68a; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #F59E0B; display: inline-block;"></span>
                KAREN (Âmbar Mark XLVII)
              </button>
              <button type="button" class="preset-theme-btn" data-preset="jocasta" style="background: #111827; border: 1px solid #8b5cf6; color: #e9d5ff; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: #8B5CF6; display: inline-block;"></span>
                JOCASTA (Violeta Cibernético)
              </button>
            </div>
          </div>

          <!-- Color Pickers Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label>Cor Primária (Botões & Realces)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorPrimaryPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorPrimary" placeholder="#6366F1" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor de Destaque (Acento / Neon)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorAccentPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorAccent" placeholder="#38BDF8" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Fundo da Página (Principal)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorBgPagePicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorBgPage" placeholder="#0B0F19" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Fundo dos Cards (Superfície)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorBgSurfacePicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorBgSurface" placeholder="#1E293B" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Fundo do Topo / Barra de Navegação</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorBgHeaderPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorBgHeader" placeholder="#0F172A" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor do Texto Principal</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorTextMainPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorTextMain" placeholder="#F8FAFC" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor do Nome/Marca na Barra Superior</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorTopbarBrandPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorTopbarBrand" placeholder="#38BDF8" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor do Título Ativo na Barra Superior</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorTopbarTitlePicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorTopbarTitle" placeholder="#F8FAFC" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor da Borda da Barra Superior</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgColorTopbarBorderPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgColorTopbarBorder" placeholder="rgba(255, 255, 255, 0.08)" style="flex: 1;">
              </div>
            </div>
          </div>

          <!-- Live Theme Preview Box -->
          <div id="themeLivePreviewCard" style="margin-top: 1.25rem; padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-hover); background: var(--bg-surface); transition: all 0.3s ease;">
            <div style="font-weight: 700; font-size: 0.88rem; margin-bottom: 0.6rem; color: var(--text-muted); text-transform: uppercase;">Pré-visualização em Tempo Real do Tema</div>
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <div>
                <h3 id="previewTitleText" style="margin: 0; color: var(--text-main); font-size: 1.15rem;">J.A.R.V.I.S. Core Engine</h3>
                <p id="previewSubtitleText" style="margin: 0.2rem 0 0 0; color: var(--text-muted); font-size: 0.85rem;">Assim é como seus cartões, botões e textos aparecerão no painel.</p>
              </div>
              <div style="display: flex; gap: 0.6rem; align-items: center;">
                <span id="previewBadge" style="padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: var(--cyan); border: 1px solid var(--cyan);">Acento Neon</span>
                <button type="button" id="previewBtn" style="padding: 0.5rem 1.1rem; border-radius: 8px; font-weight: 700; border: none; background: var(--primary); color: #fff; cursor: default;">Botão Primário</button>
              </div>
            </div>
          </div>
          <button type="button" class="primary-btn" id="saveBotThemeBtn" style="margin-top: 1rem; font-weight: 700;">💾 Salvar Cores & Tema do Painel</button>
        </div>

        <!-- 4. EMBLEMAS & CORES NO DISCORD -->
        <div class="card">
          <h2 id="cfgHeadingEmbeds">📜 Estilo das Mensagens (Embeds) no Discord</h2>
          <p id="cfgHeadingEmbedsDesc">Configure as cores das mensagens enviadas pelo bot nos canais do Discord.</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label>Cor Primária do Embed</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgEmbedPrimaryPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgEmbedPrimary" placeholder="#6366F1" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor de Sucesso (Verde)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgEmbedSuccessPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgEmbedSuccess" placeholder="#10B981" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor de Aviso (Amarelo)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgEmbedWarningPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgEmbedWarning" placeholder="#F59E0B" style="flex: 1;">
              </div>
            </div>

            <div class="form-group">
              <label>Cor de Erro (Vermelho)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="cfgEmbedErrorPicker" style="width: 44px; height: 38px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
                <input type="text" id="cfgEmbedError" placeholder="#EF4444" style="flex: 1;">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Texto de Rodapé dos Embeds (Rodapé)</label>
            <input type="text" id="cfgEmbedFooter" placeholder="Ex: J.A.R.V.I.S. • Sistemas Centrais">
          </div>
        </div>

        
        <!-- CENTRAL DE COMANDOS & AJUDA (/ajuda & +ajuda) -->
        <div class="card" style="grid-column: 1 / -1; background: linear-gradient(135deg, rgba(88, 101, 242, 0.08), rgba(0, 229, 255, 0.04)); border: 1px solid rgba(88, 101, 242, 0.35);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <h2 style="margin: 0 0 0.35rem 0; display: flex; align-items: center; gap: 8px;">
                <span>📖</span> Central de Comandos & Ajuda (/ajuda & +ajuda)
              </h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem;">
                Ative ou desative o comando de ajuda e customize totalmente o título, descrição, cores, rodapé e emojis de cada categoria (suporta emojis do servidor).
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <label class="switch" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 700; font-size: 0.9rem;">
                <input type="checkbox" id="cfgHelpEnabled" checked style="accent-color: #5865F2; width: 18px; height: 18px;">
                <span>Comando de Ajuda Ativo</span>
              </label>
              <button type="button" class="primary-btn" id="saveHelpConfigBtn" style="padding: 0.45rem 1.15rem; font-weight: 700; font-size: 0.82rem; background: #5865F2; border-color: #5865F2;">💾 Salvar Ajuda</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
            <!-- Título do Embed -->
            <div class="form-group">
              <label style="display: flex; justify-content: space-between; align-items: center;">
                <span>Título do Menu</span>
                <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('cfgHelpTitle')" title="Inserir Emoji">😀</button>
              </label>
              <input type="text" id="cfgHelpTitle" placeholder="⚡ Central de Comandos — {bot_name}">
              <small style="color: var(--text-muted); font-size: 0.74rem;">Variáveis: {bot_name}, {prefix}, {guild_name}</small>
            </div>

            <!-- Cor do Embed -->
            <div class="form-group">
              <label>Cor Principal do Embed</label>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <input type="color" id="cfgHelpColor" value="#5865F2" style="width: 44px; height: 38px; padding: 2px; border-radius: 6px; cursor: pointer; background: transparent; border: 1px solid var(--border-color);">
                <input type="text" id="cfgHelpColorText" value="#5865F2" placeholder="#5865F2" style="flex: 1;" oninput="document.getElementById('cfgHelpColor').value = this.value">
              </div>
            </div>

            <!-- Thumbnail / Ícone URL -->
            <div class="form-group">
              <label>Thumbnail / Imagem (URL Opcional)</label>
              <input type="text" id="cfgHelpThumbnail" placeholder="https://exemplo.com/icone.png (vazio = avatar do bot)">
            </div>
          </div>

          <!-- Descrição Personalizada -->
          <div class="form-group" style="margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="margin: 0;">Mensagem / Descrição do Menu Principal</label>
              <button type="button" class="secondary-btn btn-open-emoji-picker" onclick="openEmojiPicker('cfgHelpDescription')" style="padding: 0.2rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; background: rgba(88, 101, 242, 0.15); border-color: rgba(88, 101, 242, 0.4); color: #818cf8; font-weight: 600;">
                😀 Emojis do Servidor
              </button>
            </div>
            <textarea id="cfgHelpDescription" rows="3" placeholder="Deixe em branco para usar o texto padrão, ou personalize com suas próprias regras, links e instruções..."></textarea>
            <small style="color: var(--text-muted); font-size: 0.74rem;">Suporta {bot_name}, {prefix}, {guild_name}, {member_count} e emojis do servidor como <:nome:id> ou :nome:</small>
          </div>

          <!-- Rodapé do Embed -->
          <div class="form-group" style="margin-top: 0.75rem;">
            <label style="display: flex; justify-content: space-between; align-items: center;">
              <span>Texto do Rodapé (Footer)</span>
              <button type="button" class="emoji-input-trigger" onclick="openEmojiPicker('cfgHelpFooter')" title="Inserir Emoji">😀</button>
            </label>
            <input type="text" id="cfgHelpFooter" placeholder="{bot_name} • Use o menu abaixo para navegar entre as categorias">
          </div>

          <!-- Emojis das Categorias (Grid Completo com Picker) -->
          <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08);">
            <h4 style="margin: 0 0 0.4rem 0; color: #a5b4fc; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
              <span>🎭</span> Emojis Customizados por Categoria (Menu Suspenso & Embed)
            </h4>
            <p style="margin: 0 0 0.85rem 0; color: var(--text-muted); font-size: 0.8rem;">
              Personalize o emoji de cada categoria. Clique no botão de emoji para escolher qualquer emoji do seu servidor ou da biblioteca!
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem;">
              <!-- Home -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Início & Visão Geral</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_home" value="🏠" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_home')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
              <!-- Economia -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Economia & Negócios</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_economy" value="💼" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_economy')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
              <!-- Cassino -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Cassino & Apostas</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_casino" value="🎰" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_casino')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
              <!-- Música -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Música & Player</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_music" value="🎵" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_music')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
              <!-- Moderação -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Moderação & Segurança</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_moderation" value="🛡️" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_moderation')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
              <!-- XP -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Níveis & XP</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_xp" value="🎖️" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_xp')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
              <!-- Social / Diversão -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Social & Diversão</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_fun" value="🎉" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_fun')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
              <!-- Tickets -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Atendimento & Tickets</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_tickets" value="🎫" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_tickets')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
              <!-- Admin & IA -->
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 0.8rem;">Administração & IA</label>
                <div style="display: flex; gap: 0.3rem;">
                  <input type="text" id="cfgHelpEmoji_admin" value="⚙️" style="text-align: center; font-size: 1.05rem;">
                  <button type="button" class="secondary-btn" onclick="openEmojiPicker('cfgHelpEmoji_admin')" title="Escolher Emoji" style="padding: 0.35rem 0.55rem;">😀</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. IDENTIDADE & TEXTOS DO PAINEL -->
        <div class="card">
          <h2 id="cfgHeadingBranding">🏷️ Identidade & Textos do Painel Web</h2>
          <p id="cfgHeadingBrandingDesc">Títulos, insígnias e rodapé exibidos no navegador.</p>

          <div class="form-group">
            <label>Título da Aba do Navegador</label>
            <input type="text" id="cfgPanelTitle" placeholder="Ex: J.A.R.V.I.S. — Painel de Controle">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label>Insígnia / Distintivo do Topo</label>
              <input type="text" id="cfgPanelBadge" placeholder="Ex: TECH CORE v2.0">
            </div>
            <div class="form-group">
              <label>Subtítulo do Painel</label>
              <input type="text" id="cfgPanelSubtitle" placeholder="Ex: Sistemas Centrais">
            </div>
          </div>

          <div class="form-group">
            <label>Texto de Direitos Autorais / Rodapé</label>
            <input type="text" id="cfgPanelFooter" placeholder="Ex: © 2026 Stark Industries...">
          </div>
        </div>

        <!-- 6. MÓDULOS & RECURSOS ATIVOS (REDIRECIONAMENTO FONTE ÚNICA) -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(16, 185, 129, 0.35); background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.4));">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 id="cfgHeadingModules" style="margin: 0 0 0.35rem 0; color: #34d399;">🧩 Central de Gerenciamento Modular (Fonte Única — 26 Módulos)</h2>
              <p id="cfgHeadingModulesDesc" style="margin: 0; color: var(--text-muted); max-width: 760px;">
                Para garantir integridade absoluta e evitar duplicidade de estados, todos os <strong>26 módulos oficiais</strong> do J.A.R.V.I.S. (com validação de dependências, permissões, saúde e bloqueio real) são gerenciados diretamente na <strong>Central de Módulos</strong>.
              </p>
            </div>
            <button type="button" class="primary-btn" onclick="switchTab('tab-modules')" style="background: linear-gradient(135deg, #10b981, #059669); font-weight: 700; padding: 0.65rem 1.35rem;">
              🧩 Abrir Central dos 26 Módulos
            </button>
          </div>
        </div>

        <!-- 7. BACKUP DO BANCO DE DADOS LOCAL (1-CLIQUE) -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(99, 102, 241, 0.4); background: linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent);">💾 Backup do Banco de Dados Local</h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-subtle); max-width: 750px;">
                Como o J.A.R.V.I.S. roda localmente na sua máquina, você pode baixar uma cópia de segurança completa do seu banco de dados SQLite (moedas, empresas, casamentos, histórico de níveis de XP, memórias da IA e bolões) a qualquer momento com 1 clique.
              </p>
            </div>
            <a href="/api/backup/download" class="primary-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem; font-weight: 700;" download>
              📥 Baixar Backup (.sqlite)
            </a>
          </div>
        </div>

        <!-- 8. BACKUP ESTRUTURAL DO SERVIDOR DISCORD -->
        <div class="card" style="grid-column: 1 / -1; border-color: rgba(56, 189, 248, 0.4); background: linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
            <div>
              <h2 style="display: flex; align-items: center; gap: 0.5rem; color: #38bdf8;">🛡️ Backups Estruturais do Servidor Discord</h2>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-subtle); max-width: 750px;">
                Crie snapshots estruturais do seu servidor Discord (canais, categorias, cargos, permissões e configurações). Salve com segurança para restauração rápida em caso de raids ou acidentes.
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <input type="text" id="backupNameInput" placeholder="Nome do Snapshot (Ex: Pre-Evento)" style="padding: 0.55rem 0.85rem; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-color); color: var(--text-main); font-size: 0.85rem; min-width: 200px;">
              <button type="button" class="primary-btn" id="createBackupBtn" style="padding: 0.55rem 1.25rem; font-weight: 700;">
                ➕ Criar Novo Backup
              </button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 0.65rem 0.85rem;">ID</th>
                  <th style="padding: 0.65rem 0.85rem;">Nome do Snapshot</th>
                  <th style="padding: 0.65rem 0.85rem;">Canais</th>
                  <th style="padding: 0.65rem 0.85rem;">Cargos</th>
                  <th style="padding: 0.65rem 0.85rem;">Criador</th>
                  <th style="padding: 0.65rem 0.85rem;">Data de Criação</th>
                  <th style="padding: 0.65rem 0.85rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="backupsTableBody">
                <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum backup estrutural encontrado para este servidor.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Bottom Floating Action Bar -->
      <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; position: sticky; bottom: 1rem; z-index: 50; box-shadow: var(--shadow-lg);">
        <button type="button" class="secondary-btn" id="resetConfigBtnBottom">🔄 Restaurar Padrões</button>
        <button type="button" class="primary-btn" id="saveGlobalConfigBtnBottom" style="padding: 0.65rem 2rem; font-weight: 700; font-size: 0.95rem;">💾 Salvar Todas as Configurações</button>
      </div>
    </div>
`;
};
