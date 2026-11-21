module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `<div id="tab-members" class="tab-content">
      <!-- Header Banner (Estilo Informativo Recomendado) -->
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(88, 101, 242, 0.08), rgba(0, 229, 255, 0.05)); border: 1px solid rgba(88, 101, 242, 0.25);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 style="margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>👥</span> Central de Membros & Gestão Administrativa
            </h2>
            <p style="margin: 0.35rem 0 0 0; color: #949ba4; font-size: 0.88rem;">
              Gerencie cada usuário do servidor com ferramentas completas de economia, moderação, cargos, leveis, memórias personalizadas para a IA e envio de DM com interceptador de até 2 respostas.
            </p>
          </div>
          <button type="button" id="refreshMembersBtn" class="secondary-btn" style="padding: 0.5rem 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
            🔄 Atualizar Membros
          </button>
        </div>

        <div style="margin-top: 1.25rem;">
          <h3 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #dbdee1; display: flex; align-items: center; gap: 0.4rem;">
            💡 Medidas & Ações Disponíveis por Usuário
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0.75rem;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.35rem 0; color: #00E5FF; font-size: 0.9rem;">🛡️ Punições & Moderação</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #949ba4;">Timeout/Mute com duração personalizável, Warn oficial com escalação automática, Kick e Ban com exclusão de mensagens.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.35rem 0; color: #57F287; font-size: 0.9rem;">💰 Economia, Dívidas & Níveis</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #949ba4;">Defina, adicione ou remova saldo na carteira e no banco, zere saldos negativos/dívidas e defina o nível e XP do membro.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.35rem 0; color: #FEE75C; font-size: 0.9rem;">🧠 Memória Pessoal da IA</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #949ba4;">Grave fatos, apelidos ou regras sobre esta pessoa específica. A IA lembrará sempre ao interagir com ela!</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem;">
              <h4 style="margin: 0 0 0.35rem 0; color: #EB459E; font-size: 0.9rem;">💬 Mensagem PV & Monitor 2 Respostas</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #949ba4;">Envie uma DM oficial do bot para o membro e visualize em tempo real no painel as próximas 2 respostas dele!</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Pesquisa e Filtros Rápidos -->
      <div class="card" style="margin-bottom: 1rem; padding: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <div style="flex: 1; min-width: 260px;">
            <input type="text" id="memberSearchInput" placeholder="🔍 Pesquisar por nome, apelido ou ID do usuário..." style="width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; font-size: 0.9rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; color: #fff;">
          </div>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;" id="memberFilterPills">
            <button type="button" class="btn-filter-pill active" data-filter="all">Todos (<span id="filterCountAll">0</span>)</button>
            <button type="button" class="btn-filter-pill" data-filter="dm">💬 Monitorando PV</button>
            <button type="button" class="btn-filter-pill" data-filter="money">Com Saldo</button>
            <button type="button" class="btn-filter-pill" data-filter="indebted">🚨 Endividados</button>
            <button type="button" class="btn-filter-pill" data-filter="muted">🔇 Silenciados</button>
            <button type="button" class="btn-filter-pill" data-filter="warns">⚠️ Com Warns</button>
            <button type="button" class="btn-filter-pill" data-filter="memories">🧠 Com Memória IA</button>
          </div>
        </div>
      </div>

      <!-- Lista de Membros -->
      <div id="membersListContainer" style="display: flex; flex-direction: column; gap: 0.75rem; min-height: 200px;">
        <div style="text-align: center; padding: 3rem 1rem; color: #949ba4;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
          Carregando membros do servidor...
        </div>
      </div>
    </div>

    <!-- MODAL DE GESTÃO DO MEMBRO (Tema Dark Discord/Cyber) -->
    <div id="memberManageModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
      <div class="modal-card" style="background: #151821; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; max-width: 860px; width: 94%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(56, 189, 248, 0.2); overflow: hidden;">
        <!-- Modal Header -->
        <div style="padding: 1.15rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: #0f1219;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <img id="mModalAvatar" src="" alt="Avatar" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #38BDF8;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <h3 id="mModalName" style="margin: 0; font-size: 1.15rem; color: #FFFFFF; font-weight: 700;">Nome do Usuário</h3>
                <span id="mModalBadges"></span>
              </div>
              <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.15rem; font-family: monospace;">
                ID: <span id="mModalId" style="color: #cbd5e1;">000000000000000000</span>
              </div>
            </div>
          </div>
          <button type="button" id="closeMemberModalBtn" style="background: transparent; border: none; font-size: 1.6rem; color: #94a3b8; cursor: pointer; padding: 0.2rem 0.5rem; line-height: 1; transition: color 0.15s ease;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#94a3b8'">&times;</button>
        </div>

        <!-- Subtabs Navigation -->
        <div id="mModalTabsNav" class="mmodal-nav-container">
          <button class="mmodal-tab-btn active" data-subtab="msub-economy">💰 Economia</button>
          <button class="mmodal-tab-btn" data-subtab="msub-timeout">🔇 Mute / Timeout</button>
          <button class="mmodal-tab-btn" data-subtab="msub-warn">⚠️ Warn (Strike)</button>
          <button class="mmodal-tab-btn" data-subtab="msub-verbal-warn">📢 Advertência Verbal</button>
          <button class="mmodal-tab-btn" data-subtab="msub-punish">🔨 Ban & Kick</button>
          <button class="mmodal-tab-btn" data-subtab="msub-roles">🎭 Cargos</button>
          <button class="mmodal-tab-btn" data-subtab="msub-xp">📈 Nível & XP</button>
          <button class="mmodal-tab-btn" data-subtab="msub-memory">🧠 Memória IA</button>
          <button class="mmodal-tab-btn" data-subtab="msub-dm">💬 PV & 2 Respostas</button>
        </div>

        <!-- Modal Body Content -->
        <div style="padding: 1.25rem; overflow-y: auto; flex: 1; background: #151821;">
          <div id="mModalFeedback" style="display: none; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem;"></div>

          <!-- SUBTAB: ECONOMIA -->
          <div id="msub-economy" class="mmodal-tab-pane">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">💵 Carteira Atual</div>
                <div id="mEcoWalletDisp" style="font-size: 1.35rem; font-weight: 800; color: #10B981; margin-top: 0.25rem;">R$ 0</div>
              </div>
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">🏦 Banco Atual</div>
                <div id="mEcoBankDisp" style="font-size: 1.35rem; font-weight: 800; color: #38BDF8; margin-top: 0.25rem;">R$ 0</div>
              </div>
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">🚨 Status Financeiro</div>
                <div id="mEcoStatusDisp" style="font-size: 0.95rem; font-weight: 700; color: #A78BFA; margin-top: 0.45rem;">Regular / Positivo</div>
              </div>
            </div>

            <div class="card" style="margin: 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <h4 style="margin: 0 0 0.85rem 0; font-size: 0.95rem; color: #F1F5F9;">💵 Executar Ajuste Financeiro</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div class="form-group" style="margin: 0;">
                  <label>Tipo de Operação</label>
                  <select id="mEcoTypeSelect">
                    <option value="add">➕ Adicionar Saldo</option>
                    <option value="remove">➖ Remover Saldo</option>
                    <option value="set">🟰 Definir Saldo Exato</option>
                    <option value="clear_debt">🛡️ Zerar Dívida / Limpar Saldo Negativo</option>
                  </select>
                </div>
                <div class="form-group" style="margin: 0;">
                  <label>Destino da Moeda</label>
                  <select id="mEcoFieldSelect">
                    <option value="wallet">💵 Carteira (Mãos)</option>
                    <option value="bank">🏦 Conta Bancária</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                <div class="form-group" style="margin: 0;" id="mEcoAmountGroup">
                  <label>Quantia (R$)</label>
                  <input type="number" id="mEcoAmountInput" min="0" value="1000" placeholder="Ex: 500">
                </div>
                <div class="form-group" style="margin: 0;">
                  <label>Motivo do Ajuste</label>
                  <input type="text" id="mEcoReasonInput" value="Ajuste administrativo via painel" placeholder="Motivo...">
                </div>
              </div>

              <button type="button" id="mEcoSubmitBtn" class="primary-btn" style="width: 100%;">
                💵 Aplicar Ajuste Financeiro
              </button>
            </div>
          </div>

          <!-- SUBTAB: TIMEOUT / MUTE -->
          <div id="msub-timeout" class="mmodal-tab-pane" style="display: none;">
            <div id="mTimeoutStatusCard" class="mmodal-stat-card" style="margin-bottom: 1.25rem;">
              <div style="font-size: 0.8rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">Status Atual de Silenciamento</div>
              <div id="mTimeoutStatusText" style="font-size: 1rem; font-weight: 600; color: #10B981; margin-top: 0.25rem;">🔊 Membro não está silenciado.</div>
            </div>

            <div class="card" style="margin: 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <h4 style="margin: 0 0 0.85rem 0; font-size: 0.95rem; color: #F1F5F9;">🔇 Aplicar Silenciamento (Timeout Discord)</h4>
              <div class="form-group">
                <label>Duração do Silenciamento</label>
                <select id="mTimeoutDurationSelect">
                  <option value="60">1 minuto (60 segundos)</option>
                  <option value="300" selected>5 minutos</option>
                  <option value="600">10 minutos</option>
                  <option value="3600">1 hora</option>
                  <option value="86400">1 dia (24 horas)</option>
                  <option value="604800">7 dias (1 semana)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Motivo do Silenciamento</label>
                <input type="text" id="mTimeoutReasonInput" value="Infração das diretrizes do servidor" placeholder="Descreva o motivo...">
              </div>
              <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="mTimeoutApplyBtn" class="primary-btn" style="flex: 2; background: #ed4245;">
                  🔇 Aplicar Silenciamento
                </button>
                <button type="button" id="mTimeoutRemoveBtn" class="secondary-btn" style="flex: 1;">
                  🔊 Remover Mute
                </button>
              </div>
            </div>
          </div>

          <!-- SUBTAB: WARN OFICIAL (STRIKE) -->
          <div id="msub-warn" class="mmodal-tab-pane" style="display: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">⚠️ Warns Ativos (Strikes)</div>
                <div id="mWarnActiveDisp" style="font-size: 1.35rem; font-weight: 800; color: #F59E0B; margin-top: 0.25rem;">0</div>
              </div>
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">📜 Total de Infrações</div>
                <div id="mWarnTotalDisp" style="font-size: 1.35rem; font-weight: 800; color: #E2E8F0; margin-top: 0.25rem;">0</div>
              </div>
            </div>

            <div class="card" style="margin: 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <h4 style="margin: 0 0 0.4rem 0; font-size: 0.95rem; color: #F59E0B;">⚠️ Emitir Warn Oficial (Strike com Escalonamento)</h4>
              <p style="font-size: 0.82rem; color: #949ba4; margin-top: 0; margin-bottom: 0.85rem;">
                Aplica um <strong>strike formal</strong> registrado no banco de dados. Conta diretamente para as regras de escalonamento automático de punições do servidor (ex: 3 warns = timeout, 5 = kick).
              </p>
              <div class="form-group">
                <label>Motivo do Warn</label>
                <input type="text" id="mWarnReasonInput" placeholder="Ex: Quebra direta da regra de respeito e flood recorrente">
              </div>
              <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="mWarnSubmitBtn" class="primary-btn" style="flex: 2; background: #e67e22;">
                  ⚠️ Aplicar Warn Oficial (Strike)
                </button>
                <button type="button" id="mWarnClearBtn" class="secondary-btn" style="flex: 1; color: #ed4245;">
                  🗑️ Limpar Todos os Warns
                </button>
              </div>
            </div>
          </div>

          <!-- SUBTAB: ADVERTÊNCIA VERBAL (AVISO EDUCATIVO) -->
          <div id="msub-verbal-warn" class="mmodal-tab-pane" style="display: none;">
            <div class="card" style="margin: 0; background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.25);">
              <h4 style="margin: 0 0 0.4rem 0; font-size: 0.95rem; color: #00E5FF;">📢 Emitir Advertência Verbal Oficial (Sem Strike)</h4>
              <p style="font-size: 0.82rem; color: #949ba4; margin-top: 0; margin-bottom: 0.85rem;">
                Envia uma <strong>advertência verbal educativa</strong> no privado do membro e registra na auditoria.
                <br><strong style="color: #57F287;">✓ Vantagem:</strong> Serve para orientar o membro e corrigir desvios leves <strong>sem aplicar strike</strong> no sistema de expulsão/banimento automático.
              </p>
              <div class="form-group">
                <label>Motivo da Advertência Verbal</label>
                <input type="text" id="mVerbalReasonInput" placeholder="Ex: Evite discussões acaloradas e mantenha o tom amigável no canal geral.">
              </div>
              <div class="form-group">
                <label>Diretriz / Regra Violada (Opcional)</label>
                <input type="text" id="mVerbalRuleInput" placeholder="Ex: Regra #1 - Respeito mútuo">
              </div>
              <button type="button" id="mVerbalWarnSubmitBtn" class="primary-btn" style="background: #00E5FF; color: #000; font-weight: 700; width: 100%; margin-top: 0.5rem;">
                📢 Enviar Advertência Verbal ao Membro
              </button>
            </div>
          </div>

          <!-- SUBTAB: BAN & KICK -->
          <div id="msub-punish" class="mmodal-tab-pane" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="card" style="margin: 0; background: rgba(237, 66, 69, 0.05); border: 1px solid rgba(237, 66, 69, 0.2);">
                <h4 style="margin: 0 0 0.4rem 0; color: #ED4245; font-size: 1rem;">👢 Expulsar do Servidor (Kick)</h4>
                <p style="font-size: 0.82rem; color: #949ba4; margin-top: 0;">O membro será removido, mas poderá entrar novamente com um convite.</p>
                <div class="form-group">
                  <label>Motivo da Expulsão</label>
                  <input type="text" id="mKickReasonInput" placeholder="Ex: Quebra recorrente de regras leves">
                </div>
                <button type="button" id="mKickSubmitBtn" class="primary-btn" style="background: #e67e22; width: 100%;">
                  👢 Confirmar Expulsão (Kick)
                </button>
              </div>

              <div class="card" style="margin: 0; background: rgba(237, 66, 69, 0.08); border: 1px solid rgba(237, 66, 69, 0.35);">
                <h4 style="margin: 0 0 0.4rem 0; color: #ED4245; font-size: 1rem;">🔨 Banir Permanentemente (Ban)</h4>
                <p style="font-size: 0.82rem; color: #949ba4; margin-top: 0;">Impede o retorno do usuário e opcionalmente apaga as mensagens recentes dele.</p>
                <div class="form-group">
                  <label>Apagar Mensagens Recentes</label>
                  <select id="mBanDeleteDaysSelect">
                    <option value="0">Não apagar mensagens</option>
                    <option value="1">Apagar mensagens das últimas 24 horas</option>
                    <option value="7">Apagar mensagens dos últimos 7 dias</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Motivo do Banimento</label>
                  <input type="text" id="mBanReasonInput" placeholder="Ex: Ataques de raid, desrespeito grave ou spam ilícito">
                </div>
                <button type="button" id="mBanSubmitBtn" class="primary-btn" style="background: #ed4245; width: 100%;">
                  🔨 Confirmar Banimento Permanente (Ban)
                </button>
              </div>
            </div>
          </div>

          <!-- SUBTAB: CARGOS -->
          <div id="msub-roles" class="mmodal-tab-pane" style="display: none;">
            <p style="font-size: 0.85rem; color: #949ba4; margin-top: 0;">Adicione ou remova cargos do servidor deste membro com um clique.</p>
            <div id="mRolesListContainer" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 380px; overflow-y: auto;">
              <div style="text-align: center; color: #949ba4; padding: 2rem;">Carregando cargos...</div>
            </div>
          </div>

          <!-- SUBTAB: NÍVEL & XP -->
          <div id="msub-xp" class="mmodal-tab-pane" style="display: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">🏆 Nível Atual</div>
                <div id="mXpLevelDisp" style="font-size: 1.35rem; font-weight: 800; color: #38BDF8; margin-top: 0.25rem;">0</div>
              </div>
              <div class="mmodal-stat-card">
                <div style="font-size: 0.78rem; color: #949ba4; font-weight: 600; text-transform: uppercase;">⚡ XP Total Acumulado</div>
                <div id="mXpTotalDisp" style="font-size: 1.35rem; font-weight: 800; color: #10B981; margin-top: 0.25rem;">0 XP</div>
              </div>
            </div>

            <div class="card" style="margin: 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <h4 style="margin: 0 0 0.85rem 0; font-size: 0.95rem; color: #F1F5F9;">📈 Ajustar Nível e Experiência</h4>
              <div class="form-group">
                <label>Tipo de Alteração</label>
                <select id="mXpTypeSelect">
                  <option value="set_level">Definir Nível Exato (Level)</option>
                  <option value="set_xp">Definir XP Total</option>
                  <option value="add_xp">Adicionar Quantidade de XP (+)</option>
                  <option value="reset">Zerar Toda a Progressão (Reset)</option>
                </select>
              </div>
              <div class="form-group" id="mXpValueGroup">
                <label id="mXpValueLabel">Novo Nível (Level)</label>
                <input type="number" id="mXpValueInput" min="0" value="5">
              </div>
              <button type="button" id="mXpSubmitBtn" class="primary-btn" style="width: 100%; margin-top: 0.5rem;">
                📈 Atualizar Nível & XP
              </button>
            </div>
          </div>

          <!-- SUBTAB: MEMÓRIA DA IA SOBRE ESTE USUÁRIO -->
          <div id="msub-memory" class="mmodal-tab-pane" style="display: none;">
            <p style="font-size: 0.85rem; color: #949ba4; margin-top: 0;">
              Grave memórias personalizadas no cérebro da IA sobre esta pessoa. O J.A.R.V.I.S terá essas instruções injetadas diretamente ao conversar com ela.
            </p>

            <div class="card" style="margin: 0 0 1.25rem 0; background: rgba(0,0,0,0.25);">
              <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #FEE75C;">🧠 Gravar Nova Memória</h4>
              <div class="form-group">
                <label>Chave / Identificador (ex: apelido, cargo_oculto, regras, historia)</label>
                <input type="text" id="mUserMemKeyInput" placeholder="ex: apelido_vip">
              </div>
              <div class="form-group">
                <label>Conteúdo / Fato que a IA deve sempre lembrar</label>
                <textarea id="mUserMemValInput" rows="3" placeholder="Ex: Trate este membro com deferência especial de programador sênior e chame-o de Chefe."></textarea>
              </div>
              <button type="button" id="mUserMemSubmitBtn" class="primary-btn" style="width: 100%;">
                💾 Gravar Memória no Cérebro da IA
              </button>
            </div>

            <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #dbdee1;">📋 Memórias Ativas Deste Membro</h4>
            <div id="mUserMemoriesList" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto;">
              <div style="text-align: center; color: #949ba4; padding: 1.5rem;">Nenhuma memória específica gravada ainda.</div>
            </div>
          </div>

          <!-- SUBTAB: PV & INTERCEPTADOR DE 2 RESPOSTAS -->
          <div id="msub-dm" class="mmodal-tab-pane" style="display: none;">
            <p style="font-size: 0.85rem; color: #949ba4; margin-top: 0;">
              Envie uma mensagem direta (DM) oficial pelo bot para este membro. O interceptador do bot monitorará e exibirá abaixo em tempo real as <strong>próximas 2 respostas</strong> que ele enviar!
            </p>

            <div class="card" style="margin: 0 0 1.25rem 0; background: rgba(0,0,0,0.25);">
              <div class="form-group">
                <label>Mensagem a Enviar no PV (DM)</label>
                <textarea id="mDmMessageInput" rows="3" placeholder="Olá! Entramos em contato a respeito da sua atividade no servidor..."></textarea>
              </div>
              <button type="button" id="mDmSendBtn" class="primary-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <span>📤</span> Enviar Mensagem no PV e Iniciar Monitoramento
              </button>
            </div>

            <div class="card" style="margin: 0; background: rgba(0,0,0,0.18); border: 1px solid rgba(88, 101, 242, 0.25);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                <h4 style="margin: 0; font-size: 0.95rem; color: #00E5FF; display: flex; align-items: center; gap: 0.4rem;">
                  <span>📡</span> Monitor de Respostas do Membro (Interceptador)
                </h4>
                <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                  <span id="mDmStatusBadge" class="badge" style="background: rgba(88, 101, 242, 0.2); color: #5865F2;">Aguardando Envio</span>
                  <button type="button" id="mDmRefreshBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">🔄 Atualizar</button>
                  <button type="button" id="mDmFinishBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; color: #e67e22; display: none;" title="Encerra o monitoramento e reativa a IA">⏹️ Finalizar</button>
                  <button type="button" id="mDmClearBtn" class="secondary-btn" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; color: #ed4245; display: none;" title="Limpar histórico">🗑️ Limpar</button>
                </div>
              </div>

              <!-- Notice Box -->
              <div id="mDmNoticeBox" style="display: none; font-size: 0.82rem; padding: 0.55rem 0.85rem; border-radius: 6px; margin-bottom: 0.85rem; line-height: 1.4;"></div>

              <!-- Chat Stream Display -->
              <div style="display: flex; flex-direction: column; gap: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 0.85rem; min-height: 140px;">
                <!-- Mensagem do Admin / Bot -->
                <div id="mDmOutboundBox" style="background: rgba(88, 101, 242, 0.15); border-left: 3px solid #5865F2; padding: 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.75rem; color: #5865F2; font-weight: 700; margin-bottom: 0.2rem;">🤖 BOT (ENVIADA PELO PAINEL):</div>
                  <div id="mDmOutboundText" style="font-size: 0.88rem; color: #dbdee1;">Nenhuma mensagem enviada nesta sessão.</div>
                  <div id="mDmOutboundTime" style="font-size: 0.72rem; color: #949ba4; text-align: right; margin-top: 0.3rem;"></div>
                </div>

                <!-- Resposta 1 do Membro -->
                <div id="mDmReply1Box" style="background: rgba(0,0,0,0.25); border-left: 3px solid rgba(255,255,255,0.15); padding: 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.75rem; color: #00E5FF; font-weight: 700; margin-bottom: 0.2rem;">💬 1ª RESPOSTA DO MEMBRO:</div>
                  <div id="mDmReply1Text" style="font-size: 0.88rem; color: #949ba4; font-style: italic;">Aguardando envio de mensagem pelo painel...</div>
                  <div id="mDmReply1Time" style="font-size: 0.72rem; color: #949ba4; text-align: right; margin-top: 0.3rem;"></div>
                </div>

                <!-- Resposta 2 do Membro -->
                <div id="mDmReply2Box" style="background: rgba(0,0,0,0.25); border-left: 3px solid rgba(255,255,255,0.15); padding: 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.75rem; color: #57F287; font-weight: 700; margin-bottom: 0.2rem;">💬 2ª RESPOSTA DO MEMBRO:</div>
                  <div id="mDmReply2Text" style="font-size: 0.88rem; color: #949ba4; font-style: italic;">Aguardando envio de mensagem pelo painel...</div>
                  <div id="mDmReply2Time" style="font-size: 0.72rem; color: #949ba4; text-align: right; margin-top: 0.3rem;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 8: MODERAÇÃO & SEGURANÇA -->
    `;
};
