module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-reviews" class="tab-content">
      <!-- HEADER COM AÇÕES RÁPIDAS -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.35rem; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
            <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png" style="width: 26px; height: 26px; object-fit: contain;" alt="">
            Painel de Reputação & Avaliações da Equipe
          </h2>
          <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 0.88rem;">
            Acompanhe o desempenho, média de satisfação dos membros e faça a moderação dos feedbacks em tempo real.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="secondary-btn" id="refreshReviewsBtn" style="height: 38px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            Atualizar Feedbacks
          </button>
        </div>
      </div>

      <!-- ROW 1: CARDS DE MÉTRICAS / KPIS (Scorecards) -->
      <div class="stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 1.5rem;">
        <!-- KPI 1: MÉDIA GERAL -->
        <div class="stat-card" style="border-left: 4px solid #F59E0B; background: linear-gradient(145deg, rgba(245, 158, 11, 0.04), var(--bg-surface));">
          <div class="stat-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Média Geral da Staff</span>
            <span style="color: #F59E0B; font-size: 1.1rem;">★</span>
          </div>
          <div style="display: flex; align-items: baseline; gap: 8px; margin: 4px 0 6px;">
            <div class="stat-value" id="reviewStatAverage" style="color: #FBBF24; font-size: 2.2rem; font-weight: 800;">5.0</div>
            <div style="color: var(--text-muted); font-size: 0.95rem; font-weight: 600;">/ 5.0</div>
          </div>
          <div id="reviewStatStarsVisual" style="color: #FBBF24; font-size: 1rem; margin-bottom: 6px; letter-spacing: 2px;">
            ★★★★★
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);" id="reviewStatTotalSub">
            Baseado em 0 atendimentos
          </div>
        </div>

        <!-- KPI 2: TOTAL DE FEEDBACKS -->
        <div class="stat-card" style="border-left: 4px solid #38BDF8; background: linear-gradient(145deg, rgba(56, 189, 248, 0.04), var(--bg-surface));">
          <div class="stat-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Atendimentos Avaliados</span>
            <span style="color: #38BDF8; font-size: 1.1rem;">📋</span>
          </div>
          <div class="stat-value" id="reviewStatTotal" style="color: #38BDF8; font-size: 2.2rem; font-weight: 800; margin: 4px 0 6px;">
            0
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <span style="background: rgba(56, 189, 248, 0.15); color: #38BDF8; padding: 2px 8px; border-radius: 999px; font-weight: 600; font-size: 0.72rem;">Auditado</span>
            <span>Feedbacks registrados</span>
          </div>
        </div>

        <!-- KPI 3: ÍNDICE DE SATISFAÇÃO -->
        <div class="stat-card" style="border-left: 4px solid #10B981; background: linear-gradient(145deg, rgba(16, 185, 129, 0.04), var(--bg-surface));">
          <div class="stat-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Índice de Satisfação</span>
            <span style="color: #10B981; font-size: 1.1rem;">💚</span>
          </div>
          <div class="stat-value" id="reviewStatPositive" style="color: #10B981; font-size: 2.2rem; font-weight: 800; margin: 4px 0 6px;">
            100%
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">
            Avaliações Positivas (4★ e 5★)
          </div>
        </div>
      </div>

      <!-- ROW 2: ANALYTICS (Distribuição de Estrelas + Destaques da Staff) -->
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); margin-bottom: 1.5rem;">
        <!-- CARD: DISTRIBUIÇÃO DAS ESTRELAS -->
        <div class="card" style="display: flex; flex-direction: column;">
          <h2 style="font-size: 1.1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
            <span>📊</span> Distribuição das Notas
          </h2>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            Proporção de notas de 1 a 5 estrelas concedidas pelos usuários.
          </p>
          <div id="reviewBreakdownContainer" style="display: flex; flex-direction: column; gap: 10px; flex: 1; justify-content: center;">
            <div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Carregando métricas...</div>
          </div>
        </div>

        <!-- CARD: DESTAQUES DA STAFF (Leaderboard) -->
        <div class="card" style="display: flex; flex-direction: column;">
          <h2 style="font-size: 1.1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
            <span>🏆</span> Top Atendentes da Staff
          </h2>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            Moderadores e suportes com melhores médias e mais atendimentos.
          </p>
          <div id="reviewLeaderboardContainer" style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
            <div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Carregando ranking...</div>
          </div>
        </div>
      </div>

      <!-- ROW 3: MURAL DE FEEDBACKS & MODERAÇÃO -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.15rem; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>💬</span> Mural de Feedbacks & Moderação
            </h2>
            <p style="margin: 4px 0 0; font-size: 0.82rem; color: var(--text-muted);">
              Visualize os relatos dos membros, aprove para exibir no servidor ou modere comentários indevidos.
            </p>
          </div>

          <!-- Filtros de Feed -->
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <div style="position: relative; min-width: 220px;">
              <input type="text" id="reviewSearchInput" placeholder="Buscar por membro ou texto..." style="width: 100%; height: 36px; padding: 0 10px 0 32px; font-size: 0.82rem; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main);">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 10px; top: 11px; color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <select id="reviewFilterStars" style="height: 36px; padding: 0 10px; font-size: 0.82rem; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main);">
              <option value="ALL">⭐ Todas as Estrelas</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Estrelas)</option>
              <option value="4">⭐⭐⭐⭐ (4 Estrelas)</option>
              <option value="3">⭐⭐⭐ (3 Estrelas)</option>
              <option value="2">⭐⭐ (2 Estrelas)</option>
              <option value="1">⭐ (1 Estrela)</option>
            </select>
            <select id="reviewFilterStatus" style="height: 36px; padding: 0 10px; font-size: 0.82rem; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main);">
              <option value="ALL">📋 Todos os Status</option>
              <option value="APPROVED">✅ Aprovadas / Publicadas</option>
              <option value="PENDING">⏳ Pendentes de Moderação</option>
              <option value="REJECTED">❌ Rejeitadas / Ocultas</option>
            </select>
          </div>
        </div>

        <!-- Lista de Feedbacks Container -->
        <div id="reviewsListContainer" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem;">
            Carregando avaliações...
          </div>
        </div>
      </div>

      <!-- ROW 4: CONFIGURAÇÕES & GUIA (Mantendo canais e status para salvar) -->
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));">
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2 style="font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <span>⚙️</span> Configurações do Módulo de Avaliações
            </h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
              Defina o canal de transparência e regras de publicação para a sua equipe.
            </p>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px; display: block;">Canal Público para Postagem de Avaliações</label>
              <select id="reviewChannelSelect" class="channel-select" style="width: 100%; height: 38px; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main); padding: 0 10px;">
                <option value="">Carregando canais...</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Canal onde as avaliações aprovadas serão exibidas.</small>
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px; display: block;">Fila de Moderação Prévia</label>
              <select id="modReviewsStatus" style="width: 100%; height: 38px; border-radius: var(--radius); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-main); padding: 0 10px;">
                <option value="true" selected>Aprovação Prévia Ativada (Recomendado)</option>
                <option value="false">Publicação Direta Imediata</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Evita spam ou mensagens ofensivas antes da publicação.</small>
            </div>
          </div>
          <button class="primary-btn" id="saveReviewsBtn" style="width: 100%; margin-top: 1rem; height: 38px;">💾 Salvar Configurações de Avaliações</button>
        </div>

        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2 style="font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <span>📋</span> Comandos de Avaliação no Discord
            </h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
              Instruções para seus membros e moderadores usarem no chat.
            </p>
            <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; font-size: 0.85rem; line-height: 1.6; color: #dbdee1;">
              <div style="font-weight: 700; color: #00E5FF; margin-bottom: 0.4rem;">💬 Como os membros avaliam:</div>
              <div>• <code>+avaliar @administrador 5 Atendimento excelente!</code></div>
              <div>• <code>/avaliar atendente:@administrador estrelas:5</code></div>
              <div style="margin-top: 0.5rem; font-size: 0.76rem; color: #94a3b8;">⚠️ <em>Apenas membros com cargo de Administrador podem receber avaliações.</em></div>
              <div style="margin-top: 0.75rem; font-weight: 700; color: #57F287;">📊 Consulta de Reputação:</div>
              <div>• <code>+perfil @staff</code> — Exibe a média ⭐ e total de avaliações recebidas!</div>
              <div>• <code>+topstaff</code> — Ranking dos administradores mais bem avaliados.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB COMMUNITY: RELATÓRIOS & BRIEFING -->
    `;
};
