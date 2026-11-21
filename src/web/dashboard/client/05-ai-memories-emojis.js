module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // AI FORCED MEMORIES
    // ==========================================
    let currentEditingMemoryKey = null;

    function renderAiMemories(memories = []) {
      const container = document.getElementById('aiMemoriesListContainer');
      const badge = document.getElementById('aiMemCountBadge');
      if (!container) return;
      if (badge) badge.innerText = (memories.length || 0) + ' ' + (memories.length === 1 ? 'memória' : 'memórias');

      if (!memories || memories.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem 1rem; color: #949ba4; font-size: 0.88rem; background: rgba(0,0,0,0.15); border-radius: 6px;">' +
          '<div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🧠</div>' +
          '<strong>Nenhuma memória personalizada forçada no momento.</strong>' +
          '<div style="margin-top: 0.35rem; font-size: 0.8rem;">Adicione regras, nomes ou fatos no formulário ao lado para a IA lembrar permanentemente.</div>' +
        '</div>';
        return;
      }

      container.innerHTML = memories.map(m => {
        const keyEsc = escapeHtml(m.key);
        const valEsc = escapeHtml(m.value);
        const dateStr = m.updated_at ? new Date(m.updated_at).toLocaleDateString('pt-BR') : '';
        const isBot = m.created_by === 'bot' || m.created_by === 'system';
        const originBadge = isBot
          ? '<span class="badge" style="background: rgba(87, 242, 135, 0.15); color: #57F287; font-size: 0.72rem; padding: 0.18rem 0.5rem; border: 1px solid rgba(87, 242, 135, 0.25);">🤖 Memória do Bot (Permanente)</span>'
          : '<span class="badge" style="background: rgba(254, 231, 92, 0.15); color: #FEE75C; font-size: 0.72rem; padding: 0.18rem 0.5rem; border: 1px solid rgba(254, 231, 92, 0.25);">👑 Forçada pelo Admin</span>';

        return '<div class="card" style="padding: 0.85rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; margin: 0;">' +
          '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.4rem;">' +
            '<div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem;">' +
              '<span class="badge" style="background: rgba(0, 229, 255, 0.15); color: #00E5FF; font-family: monospace; font-size: 0.85rem; font-weight: 700;">' + keyEsc + '</span>' +
              originBadge +
            '</div>' +
            '<div style="display: flex; gap: 0.35rem;">' +
              '<button type="button" class="btn-edit-memory secondary-btn" data-key="' + keyEsc + '" style="padding: 0.25rem 0.55rem; font-size: 0.78rem;" title="Editar Memória">✏️</button>' +
              '<button type="button" class="btn-delete-memory secondary-btn" data-key="' + keyEsc + '" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; color: #ed4245;" title="Excluir Memória">🗑️</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-size: 0.85rem; color: #dbdee1; line-height: 1.4; white-space: pre-wrap; word-break: break-word;">' + valEsc + '</div>' +
          (dateStr ? '<div style="font-size: 0.72rem; color: #949ba4; margin-top: 0.4rem; text-align: right;">Atualizada em ' + dateStr + '</div>' : '') +
        '</div>';
      }).join('');

      container.querySelectorAll('.btn-edit-memory').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          const mem = memories.find(m => m.key === key);
          if (!mem) return;
          currentEditingMemoryKey = mem.key;
          const keyInp = document.getElementById('aiMemKeyInput');
          if (keyInp) {
            keyInp.value = mem.key;
            keyInp.disabled = true;
          }
          const valInp = document.getElementById('aiMemValueInput');
          if (valInp) {
            valInp.value = mem.value;
            valInp.focus();
          }
          const keyTxt = document.getElementById('aiMemEditingKeyText');
          if (keyTxt) keyTxt.innerText = mem.key;
          const banner = document.getElementById('aiMemEditingBanner');
          if (banner) banner.style.display = 'flex';
          const saveBtn = document.getElementById('saveAiMemBtn');
          if (saveBtn) saveBtn.innerText = '💾 Salvar Alterações';
        });
      });

      container.querySelectorAll('.btn-delete-memory').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.getAttribute('data-key');
          if (!confirm('Tem certeza que deseja apagar a memória "' + key + '" da IA?')) return;
          if (currentEditingMemoryKey === key) resetAiMemForm();
          await saveModule('aimemory', { action: 'DELETE', key });
          loadGuildDetails(currentGuildId);
        });
      });
    }

    function resetAiMemForm() {
      currentEditingMemoryKey = null;
      const keyInp = document.getElementById('aiMemKeyInput');
      if (keyInp) {
        keyInp.value = '';
        keyInp.disabled = false;
      }
      const valInp = document.getElementById('aiMemValueInput');
      if (valInp) valInp.value = '';
      const banner = document.getElementById('aiMemEditingBanner');
      if (banner) banner.style.display = 'none';
      const saveBtn = document.getElementById('saveAiMemBtn');
      if (saveBtn) saveBtn.innerText = '💾 Gravar Memória no Servidor';
    }

    document.getElementById('aiMemCancelEditBtn')?.addEventListener('click', resetAiMemForm);
    document.getElementById('clearAiMemBtn')?.addEventListener('click', resetAiMemForm);

    document.getElementById('saveAiMemBtn')?.addEventListener('click', async () => {
      const key = document.getElementById('aiMemKeyInput')?.value?.trim();
      const value = document.getElementById('aiMemValueInput')?.value?.trim();
      if (!key || !value) {
        return alert('Preencha a chave e o conteúdo da memória!');
      }
      await saveModule('aimemory', { action: 'SAVE', key, value });
      resetAiMemForm();
      loadGuildDetails(currentGuildId);
    });

    // ==========================================
    // EMOJI SYSTEM (CUSTOM GUILD EMOJIS & TWEMOJI)
    // ==========================================
    window.emojiCatalog = { currentGuild: [], otherGuilds: [] };
    window.emojiTargetInputId = 'speakContentInput';
    window.emojiCurrentTab = 'current';

    function applyTwemoji(root) {
      try {
        if (typeof twemoji !== 'undefined' && twemoji.parse) {
          twemoji.parse(root || document.body, {
            base: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/',
            folder: '72x72',
            ext: '.png'
          });
        }
      } catch (e) {
        console.warn('Twemoji parsing notice:', e);
      }
    }

    function renderCoinSvg() {
      return '<svg class="coin-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" fill="#ffd700"/><text x="12" y="16.5" font-size="13" font-weight="900" fill="#78350f" text-anchor="middle">$</text></svg>';
    }

    function getFlattenedOtherEmojis() {
      const raw = window.emojiCatalog?.otherGuilds || [];
      const flat = [];
      raw.forEach(function(item) {
        if (item && Array.isArray(item.emojis)) {
          item.emojis.forEach(function(em) { flat.push(em); });
        } else if (item && item.name) {
          flat.push(item);
        }
      });
      return flat;
    }

    function renderDiscordCustomEmojis(html) {
      if (!html) return '';

      // 1. Resolve full Discord custom emoji tags <:name:id> or <a:name:id> (both escaped &lt;...&gt; and raw)
      var out = html.replace(/(?:&lt;|<)\\s*(a)?\\s*:\\s*([a-zA-Z0-9_~-]+)\\s*:\\s*([0-9]+)\\s*(?:&gt;|>)/gi, function(match, anim, name, id) {
        var ext = anim ? 'gif' : 'png';
        return '<img src="https://cdn.discordapp.com/emojis/' + id + '.' + ext + '?size=48&quality=lossless" class="discord-inline-emoji" alt="' + name + '" title="' + name + '">';
      });

      // 2. Resolve shorthand :name: only when emojiCatalog is loaded and it is NOT part of an existing Discord tag
      if (window.emojiCatalog) {
        var list = (window.emojiCatalog.currentGuild || []).concat(getFlattenedOtherEmojis());
        if (list.length > 0) {
          var map = new Map();
          list.forEach(function(e) {
            if (!map.has(e.name.toLowerCase())) map.set(e.name.toLowerCase(), e);
          });
          out = out.replace(/:([a-zA-Z0-9_~-]{2,32}):/g, function(match, name, offset, fullStr) {
            var before = fullStr.substring(Math.max(0, offset - 15), offset);
            var after = fullStr.substring(offset + match.length, offset + match.length + 35);
            if (/(?:<|&lt;)(?:a)?$/i.test(before) || /^[ \\t]*[0-9]+(?:>|&gt;)/i.test(after)) {
              return match;
            }
            var found = map.get(name.toLowerCase());
            if (found) {
              return '<img src="' + found.url + '" class="discord-inline-emoji" alt="' + found.name + '" title="' + found.name + '">';
            }
            return match;
          });
        }
      }
      return out;
    }

    window.emojiCurrentTab = 'standard';
    window.standardEmojis = [
      // Expressões & Reações
      { name: 'sorriso', tag: '😀', category: 'Expressões' },
      { name: 'sorriso_olhos', tag: '😃', category: 'Expressões' },
      { name: 'feliz', tag: '😄', category: 'Expressões' },
      { name: 'gargalhada', tag: '😆', category: 'Expressões' },
      { name: 'chorando_de_rir', tag: '😂', category: 'Expressões' },
      { name: 'rolando_de_rir', tag: '🤣', category: 'Expressões' },
      { name: 'piscadela', tag: '😉', category: 'Expressões' },
      { name: 'apaixonado', tag: '😍', category: 'Expressões' },
      { name: 'beijo', tag: '😘', category: 'Expressões' },
      { name: 'legal', tag: '😎', category: 'Expressões' },
      { name: 'festa', tag: '🥳', category: 'Expressões' },
      { name: 'pensando', tag: '🤔', category: 'Expressões' },
      { name: 'silencio', tag: '🤫', category: 'Expressões' },
      { name: 'surpreso', tag: '😲', category: 'Expressões' },
      { name: 'choro', tag: '😭', category: 'Expressões' },
      { name: 'raiva', tag: '😡', category: 'Expressões' },
      { name: 'palhaco', tag: '🤡', category: 'Expressões' },
      { name: 'caveira', tag: '💀', category: 'Expressões' },
      { name: 'fantasma', tag: '👻', category: 'Expressões' },
      { name: 'alien', tag: '👽', category: 'Expressões' },
      { name: 'robo', tag: '🤖', category: 'Expressões' },
      { name: 'coracao', tag: '❤️', category: 'Expressões' },
      { name: 'fogo', tag: '🔥', category: 'Expressões' },
      { name: 'estrela', tag: '⭐', category: 'Expressões' },
      { name: 'brilho', tag: '✨', category: 'Expressões' },
      { name: 'raio', tag: '⚡', category: 'Expressões' },
      { name: 'joinha', tag: '👍', category: 'Expressões' },
      { name: 'joinha_baixo', tag: '👎', category: 'Expressões' },
      { name: 'palmas', tag: '👏', category: 'Expressões' },
      { name: 'aperto_de_mao', tag: '🤝', category: 'Expressões' },
      { name: 'forca', tag: '💪', category: 'Expressões' },

      // Economia & Cassino
      { name: 'moeda', tag: '🪙', category: 'Economia' },
      { name: 'diamante', tag: '💎', category: 'Economia' },
      { name: 'saco_de_dinheiro', tag: '💰', category: 'Economia' },
      { name: 'dinheiro', tag: '💵', category: 'Economia' },
      { name: 'cartao_credito', tag: '💳', category: 'Economia' },
      { name: 'banco', tag: '🏦', category: 'Economia' },
      { name: 'grafico_subindo', tag: '📈', category: 'Economia' },
      { name: 'grafico_descendo', tag: '📉', category: 'Economia' },
      { name: 'empresa_predio', tag: '🏢', category: 'Economia' },
      { name: 'fabrica', tag: '🏭', category: 'Economia' },
      { name: 'ouro_trofeu', tag: '🏆', category: 'Economia' },
      { name: 'medalha_ouro', tag: '🥇', category: 'Economia' },
      { name: 'slot_cassino', tag: '🎰', category: 'Economia' },
      { name: 'dado', tag: '🎲', category: 'Economia' },
      { name: 'cartas_baralho', tag: '🃏', category: 'Economia' },
      { name: 'alvo', tag: '🎯', category: 'Economia' },

      // Moderação & Segurança
      { name: 'escudo', tag: '🛡️', category: 'Moderação' },
      { name: 'espadas', tag: '⚔️', category: 'Moderação' },
      { name: 'martelo', tag: '🔨', category: 'Moderação' },
      { name: 'cadeado_fechado', tag: '🔒', category: 'Moderação' },
      { name: 'cadeado_aberto', tag: '🔓', category: 'Moderação' },
      { name: 'chave', tag: '🔑', category: 'Moderação' },
      { name: 'sirene_alerta', tag: '🚨', category: 'Moderação' },
      { name: 'atencao', tag: '⚠️', category: 'Moderação' },
      { name: 'proibido', tag: '🚫', category: 'Moderação' },
      { name: 'pare', tag: '🛑', category: 'Moderação' },
      { name: 'sinal_cruz', tag: '❌', category: 'Moderação' },
      { name: 'check_verde', tag: '✅', category: 'Moderação' },
      { name: 'sino_notificacao', tag: '🔔', category: 'Moderação' },
      { name: 'megafone', tag: '📢', category: 'Moderação' },

      // Social & Atendimento
      { name: 'ticket_ingresso', tag: '🎫', category: 'Social' },
      { name: 'ticket_cinema', tag: '🎟️', category: 'Social' },
      { name: 'envelope_carta', tag: '✉️', category: 'Social' },
      { name: 'caixa_pacote', tag: '📦', category: 'Social' },
      { name: 'alianca_anel', tag: '💍', category: 'Social' },
      { name: 'coroa', tag: '👑', category: 'Social' },
      { name: 'cafe', tag: '☕', category: 'Social' },
      { name: 'cerveja', tag: '🍺', category: 'Social' },
      { name: 'champanhe', tag: '🍾', category: 'Social' },
      { name: 'bolo_festa', tag: '🎂', category: 'Social' },
      { name: 'pizza', tag: '🍕', category: 'Social' },
      { name: 'musica_nota', tag: '🎵', category: 'Social' },
      { name: 'notas_musicais', tag: '🎶', category: 'Social' },
      { name: 'microfone', tag: '🎤', category: 'Social' },
      { name: 'fone_ouvido', tag: '🎧', category: 'Social' },
      { name: 'controle_game', tag: '🎮', category: 'Social' },
      { name: 'foguete', tag: '🚀', category: 'Social' },
      { name: 'lampada_ideia', tag: '💡', category: 'Social' },
      { name: 'ampulheta', tag: '⏳', category: 'Social' },
      { name: 'relogio', tag: '⏰', category: 'Social' }
    ];

    function updateEmojiCounters() {
      const stdCount = window.standardEmojis?.length || 0;
      const curCount = window.emojiCatalog?.currentGuild?.length || 0;
      const othCount = getFlattenedOtherEmojis().length;
      const elStd = document.getElementById('emojiStandardCount');
      const elCur = document.getElementById('emojiCurrentCount');
      const elOth = document.getElementById('emojiOtherCount');
      if (elStd) elStd.innerText = stdCount;
      if (elCur) elCur.innerText = curCount;
      if (elOth) elOth.innerText = othCount;
    }

    async function ensureEmojiCatalogLoaded() {
      updateEmojiCounters();
      const targetGId = currentGuildId || document.getElementById('guildSelector')?.value || 'current';
      if (window.emojiCatalog && ((window.emojiCatalog.currentGuild && window.emojiCatalog.currentGuild.length > 0) || (window.emojiCatalog.otherGuilds && window.emojiCatalog.otherGuilds.length > 0))) {
        return;
      }
      try {
        const res = await fetch('/api/guilds/' + encodeURIComponent(targetGId) + '/emojis', { credentials: 'same-origin' });
        if (res.ok) {
          const json = await res.json();
          window.emojiCatalog = json;
          updateEmojiCounters();
          renderEmojiGrid();
        }
      } catch (err) {
        console.error('Failed to load emoji catalog:', err);
      }
    }

    function openEmojiPicker(targetInputId) {
      window.emojiTargetInputId = targetInputId || 'speakContentInput';
      const modal = document.getElementById('emojiPickerModal');
      if (modal) {
        modal.style.display = 'flex';
        const search = document.getElementById('emojiSearchInput');
        if (search) {
          search.value = '';
          search.focus();
        }
        ensureEmojiCatalogLoaded().then(() => {
          renderEmojiGrid();
        });
      }
    }

    function closeEmojiPicker() {
      const modal = document.getElementById('emojiPickerModal');
      if (modal) modal.style.display = 'none';
    }

    function switchEmojiTab(tab) {
      window.emojiCurrentTab = tab;
      const btnStd = document.getElementById('emojiTabStandardBtn');
      const btnCur = document.getElementById('emojiTabCurrentBtn');
      const btnOth = document.getElementById('emojiTabOtherBtn');
      if (btnStd) btnStd.className = tab === 'standard' ? 'primary-btn' : 'secondary-btn';
      if (btnCur) btnCur.className = tab === 'current' ? 'primary-btn' : 'secondary-btn';
      if (btnOth) btnOth.className = tab === 'other' ? 'primary-btn' : 'secondary-btn';
      renderEmojiGrid();
    }

    function filterEmojiGrid() {
      renderEmojiGrid();
    }

    function renderEmojiGrid() {
      const grid = document.getElementById('emojiPickerGrid');
      if (!grid) return;

      const query = (document.getElementById('emojiSearchInput')?.value || '').toLowerCase().trim();
      let list = [];
      if (window.emojiCurrentTab === 'standard') {
        list = window.standardEmojis || [];
      } else if (window.emojiCurrentTab === 'current') {
        list = window.emojiCatalog?.currentGuild || [];
      } else {
        list = getFlattenedOtherEmojis();
      }

      const filtered = query
        ? list.filter(e => (e.name && e.name.toLowerCase().includes(query)) || (e.category && e.category.toLowerCase().includes(query)) || (e.guildName && e.guildName.toLowerCase().includes(query)))
        : list;

      updateEmojiCounters();

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #949ba4; padding: 2.5rem 1rem; font-size: 0.88rem;">' +
          (query ? 'Nenhum emoji encontrado para "' + escapeHtml(query) + '".' : (window.emojiCurrentTab === 'current' ? 'Nenhum emoji personalizado cadastrado neste servidor.' : (window.emojiCurrentTab === 'other' ? 'Nenhum emoji de outros servidores disponível.' : 'Nenhum emoji disponível.'))) +
        '</div>';
        return;
      }

      grid.innerHTML = filtered.map(emoji => {
        const tagEsc = escapeHtml(emoji.tag);
        const nameEsc = escapeHtml(emoji.name);
        const titleText = ':' + nameEsc + ':' + (emoji.guildName ? ' (' + escapeHtml(emoji.guildName) + ')' : (emoji.category ? ' [' + escapeHtml(emoji.category) + ']' : ''));
        if (emoji.url) {
          return '<button type="button" class="emoji-picker-btn" data-tag="' + tagEsc + '" title="' + titleText + '">' +
            '<img src="' + emoji.url + '" alt=":' + nameEsc + ':" loading="lazy">' +
          '</button>';
        } else {
          return '<button type="button" class="emoji-picker-btn" data-tag="' + tagEsc + '" title="' + titleText + '" style="font-size: 1.55rem; line-height: 1;">' +
            emoji.tag +
          '</button>';
        }
      }).join('');

      grid.querySelectorAll('.emoji-picker-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.getAttribute('data-tag');
          insertEmoji(tag);
        });
      });
    }

    function insertEmoji(tag) {
      if (!tag) return;
      const target = document.getElementById(window.emojiTargetInputId);
      if (!target) return;

      const cleanTag = tag.trim();
      const singleFields = [
        'currencySymbolInput',
        'compTypeEmojiInput',
        'compTypeSupplyEmojiInput',
        'mbCfgEcoSymbol',
        'mbCfgStarEmoji',
        'starboardEmojiInput'
      ];
      const isSingleEmojiField = singleFields.includes(target.id);

      if (isSingleEmojiField) {
        target.value = cleanTag;
      } else {
        const start = target.selectionStart || target.value.length;
        const end = target.selectionEnd || target.value.length;
        const val = target.value;
        target.value = val.substring(0, start) + ' ' + cleanTag + ' ' + val.substring(end);
        target.selectionStart = target.selectionEnd = start + cleanTag.length + 2;
      }
      target.focus();

      // Trigger input event to update live preview
      target.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof updateBotSpeakPreview === 'function') updateBotSpeakPreview();

      const info = document.getElementById('emojiSelectedInfo');
      if (info) {
        info.innerText = 'Inserido: ' + cleanTag;
        setTimeout(() => { if (info.innerText === 'Inserido: ' + cleanTag) info.innerText = 'Pronto'; }, 2000);
      }
      if (isSingleEmojiField) {
        setTimeout(closeEmojiPicker, 300);
      }
    }

`;
};
