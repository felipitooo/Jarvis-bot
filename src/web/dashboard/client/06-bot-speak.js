module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // BOT SPEAK (TRANSMITTER & LIVE PREVIEW)
    // ==========================================
    function updateBotSpeakPreview() {
      const channelSelect = document.getElementById('speakChannelSelect');
      const previewChannelTag = document.getElementById('speakPreviewChannelTag');
      if (channelSelect && previewChannelTag) {
        const selectedOpt = channelSelect.selectedOptions ? channelSelect.selectedOptions[0] : null;
        previewChannelTag.innerText = selectedOpt && selectedOpt.value ? '# ' + selectedOpt.text.replace(/^[#\s]+/, '') : '# geral';
      }

      const spkSel = document.getElementById('speakBotInstanceSelect');
      const spkNamePreview = document.getElementById('speakBotNamePreview');
      if (spkSel && spkNamePreview) {
        const selOpt = spkSel.selectedOptions ? spkSel.selectedOptions[0] : null;
        if (selOpt) {
          const rawName = selOpt.text.replace(/^[🤖\s]+/, '').replace(/\s*\(.*\)$/, '').trim();
          spkNamePreview.innerText = rawName || 'Bot';
        }
      }

      const content = document.getElementById('speakContentInput')?.value || '';
      const previewContent = document.getElementById('speakPreviewContentText');
      if (previewContent) {
        if (content.trim()) {
          const serverName = document.getElementById('guildNameDisplay')?.value || 'Servidor';
          let rendered = escapeHtml(content)
            .replace(/\{server\}/g, '<strong>' + escapeHtml(serverName) + '</strong>')
            .replace(/\{members\}/g, '<strong>10</strong>')
            .replace(/@everyone/g, '<span style="background: rgba(88, 101, 242, 0.3); color: #c9cdfb; padding: 0 4px; border-radius: 3px; font-weight: 600;">@everyone</span>')
            .replace(/@here/g, '<span style="background: rgba(88, 101, 242, 0.3); color: #c9cdfb; padding: 0 4px; border-radius: 3px; font-weight: 600;">@here</span>');
          rendered = renderDiscordCustomEmojis(rendered);
          previewContent.innerHTML = rendered;
          applyTwemoji(previewContent);
          previewContent.style.display = 'block';
        } else {
          previewContent.style.display = 'none';
        }
      }

      const embedToggle = document.getElementById('speakEmbedToggle');
      const embedSection = document.getElementById('speakEmbedSection');
      const previewEmbedBox = document.getElementById('speakPreviewEmbedBox');
      const useEmbed = embedToggle ? embedToggle.checked : true;

      if (embedSection) embedSection.style.display = useEmbed ? 'block' : 'none';
      if (previewEmbedBox) previewEmbedBox.style.display = useEmbed ? 'block' : 'none';

      if (!useEmbed) return;

      // Color
      const colorHex = document.getElementById('speakEmbedColor')?.value || '#00E5FF';
      if (previewEmbedBox) previewEmbedBox.style.borderLeftColor = colorHex;

      // Author
      const authorName = document.getElementById('speakEmbedAuthorName')?.value?.trim() || '';
      const authorIcon = document.getElementById('speakEmbedAuthorIcon')?.value?.trim() || '';
      const previewAuthorWrap = document.getElementById('speakPreviewEmbedAuthor');
      const previewAuthorText = document.getElementById('speakPreviewAuthorName');
      const previewAuthorImg = document.getElementById('speakPreviewAuthorIcon');
      if (previewAuthorWrap) {
        if (authorName) {
          previewAuthorWrap.style.display = 'flex';
          if (previewAuthorText) previewAuthorText.innerText = authorName;
          if (previewAuthorImg) {
            if (authorIcon) {
              previewAuthorImg.src = authorIcon;
              previewAuthorImg.style.display = 'inline-block';
            } else {
              previewAuthorImg.style.display = 'none';
            }
          }
        } else {
          previewAuthorWrap.style.display = 'none';
        }
      }

      // Title & URL
      const title = document.getElementById('speakEmbedTitle')?.value?.trim() || '';
      const url = document.getElementById('speakEmbedUrl')?.value?.trim() || '';
      const previewTitle = document.getElementById('speakPreviewEmbedTitle');
      if (previewTitle) {
        if (title) {
          previewTitle.style.display = 'block';
          if (url) {
            previewTitle.innerHTML = '<a href="' + escapeHtml(url) + '" target="_blank" style="color: #00E5FF; text-decoration: none;">' + escapeHtml(title) + '</a>';
          } else {
            previewTitle.innerText = title;
          }
        } else {
          previewTitle.style.display = 'none';
        }
      }

      // Description
      const desc = document.getElementById('speakEmbedDesc')?.value || '';
      const previewDesc = document.getElementById('speakPreviewEmbedDesc');
      if (previewDesc) {
        if (desc.trim()) {
          previewDesc.style.display = 'block';
          let renderedDesc = escapeHtml(desc)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #00E5FF; text-decoration: underline;">$1</a>');
          renderedDesc = renderDiscordCustomEmojis(renderedDesc);
          previewDesc.innerHTML = renderedDesc;
          applyTwemoji(previewDesc);
        } else {
          previewDesc.style.display = 'none';
        }
      }

      // Thumbnail
      const thumbUrl = document.getElementById('speakEmbedThumbnail')?.value?.trim() || '';
      const previewThumb = document.getElementById('speakPreviewEmbedThumbnail');
      if (previewThumb) {
        if (thumbUrl) {
          previewThumb.src = thumbUrl;
          previewThumb.style.display = 'block';
        } else {
          previewThumb.style.display = 'none';
        }
      }

      // Big Image
      const imgUrl = document.getElementById('speakEmbedImage')?.value?.trim() || '';
      const previewImgWrap = document.getElementById('speakPreviewEmbedImageWrap');
      const previewImg = document.getElementById('speakPreviewEmbedImage');
      if (previewImgWrap && previewImg) {
        if (imgUrl) {
          previewImg.src = imgUrl;
          previewImgWrap.style.display = 'block';
        } else {
          previewImgWrap.style.display = 'none';
        }
      }

      // Dynamic Fields
      const fieldsContainer = document.getElementById('speakEmbedFieldsContainer');
      const previewFields = document.getElementById('speakPreviewEmbedFields');
      if (fieldsContainer && previewFields) {
        const fieldRows = fieldsContainer.querySelectorAll('.speak-field-row');
        if (fieldRows.length > 0) {
          previewFields.innerHTML = Array.from(fieldRows).map(row => {
            const fName = row.querySelector('.speak-field-name')?.value?.trim() || '';
            const fVal = row.querySelector('.speak-field-val')?.value?.trim() || '';
            const fInline = row.querySelector('.speak-field-inline')?.checked || false;
            if (!fName && !fVal) return '';
            const widthStyle = fInline ? 'flex: 1 1 45%; min-width: 140px;' : 'width: 100%;';
            return '<div style="' + widthStyle + ' margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.06);">' +
              '<div style="font-size: 0.82rem; font-weight: 700; color: #ffffff;">' + escapeHtml(fName) + '</div>' +
              '<div style="font-size: 0.82rem; color: #dbdee1; line-height: 1.35; white-space: pre-wrap;">' + escapeHtml(fVal) + '</div>' +
            '</div>';
          }).join('');
          previewFields.style.display = 'flex';
        } else {
          previewFields.innerHTML = '';
          previewFields.style.display = 'none';
        }
      }

      // Footer
      const footerText = document.getElementById('speakEmbedFooterText')?.value?.trim() || '';
      const footerIcon = document.getElementById('speakEmbedFooterIcon')?.value?.trim() || '';
      const previewFootWrap = document.getElementById('speakPreviewEmbedFooter');
      const previewFootText = document.getElementById('speakPreviewFooterText');
      const previewFootIcon = document.getElementById('speakPreviewFooterIcon');
      if (previewFootWrap) {
        if (footerText) {
          previewFootWrap.style.display = 'flex';
          if (previewFootText) previewFootText.innerText = footerText;
          if (previewFootIcon) {
            if (footerIcon) {
              previewFootIcon.src = footerIcon;
              previewFootIcon.style.display = 'inline-block';
            } else {
              previewFootIcon.style.display = 'none';
            }
          }
        } else {
          previewFootWrap.style.display = 'none';
        }
      }
    }

    // Embed field adder
    document.getElementById('speakAddEmbedFieldBtn')?.addEventListener('click', () => {
      const container = document.getElementById('speakEmbedFieldsContainer');
      if (!container) return;
      const count = container.querySelectorAll('.speak-field-row').length;
      if (count >= 25) return alert('Máximo de 25 campos atingido!');

      const row = document.createElement('div');
      row.className = 'speak-field-row';
      row.style = 'background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem; display: flex; flex-direction: column; gap: 0.45rem;';
      row.innerHTML = '<div style="display: flex; gap: 0.5rem; align-items: center;">' +
        '<input type="text" class="speak-field-name" placeholder="Título do Campo" style="flex: 1; font-weight: 600; font-size: 0.85rem;">' +
        '<label style="display: flex; align-items: center; gap: 0.3rem; margin: 0; font-size: 0.78rem; cursor: pointer; color: var(--text-muted);">' +
          '<input type="checkbox" class="speak-field-inline" style="cursor: pointer;"> Em linha (Inline)' +
        '</label>' +
        '<button type="button" class="secondary-btn btn-remove-field" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: #ed4245;">✕</button>' +
      '</div>' +
      '<textarea class="speak-field-val" rows="2" placeholder="Valor / Conteúdo do Campo" style="font-size: 0.85rem;"></textarea>';

      row.querySelector('.btn-remove-field').addEventListener('click', () => {
        row.remove();
        updateBotSpeakPreview();
      });

      row.querySelector('.speak-field-name').addEventListener('input', updateBotSpeakPreview);
      row.querySelector('.speak-field-val').addEventListener('input', updateBotSpeakPreview);
      row.querySelector('.speak-field-inline').addEventListener('change', updateBotSpeakPreview);

      container.appendChild(row);
      updateBotSpeakPreview();
    });

    // Tag buttons for speak
    document.querySelectorAll('.btn-speak-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        const textarea = document.getElementById('speakContentInput');
        if (!textarea) return;
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + tag + text.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tag.length;
        updateBotSpeakPreview();
      });
    });

    // Color sync
    document.getElementById('speakEmbedColorPicker')?.addEventListener('input', (e) => {
      const hex = e.target.value.toUpperCase();
      const txt = document.getElementById('speakEmbedColor');
      if (txt) txt.value = hex;
      updateBotSpeakPreview();
    });

    document.getElementById('speakEmbedColor')?.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(val)) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        const picker = document.getElementById('speakEmbedColorPicker');
        if (picker) picker.value = val;
      }
      updateBotSpeakPreview();
    });

    // Event listeners to update live preview
    ['speakChannelSelect', 'speakEmbedToggle'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', updateBotSpeakPreview);
    });

    ['speakContentInput', 'speakEmbedTitle', 'speakEmbedUrl', 'speakEmbedDesc', 'speakEmbedAuthorName', 'speakEmbedAuthorIcon', 'speakEmbedImage', 'speakEmbedThumbnail', 'speakEmbedFooterText', 'speakEmbedFooterIcon'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateBotSpeakPreview);
    });

    // Dispatch message via Bot
    document.getElementById('sendBotMsgBtn')?.addEventListener('click', async () => {
      const channelId = document.getElementById('speakChannelSelect')?.value;
      if (!channelId) {
        return alert('Selecione um canal de texto para enviar a mensagem!');
      }

      const content = document.getElementById('speakContentInput')?.value?.trim() || '';
      const useEmbed = document.getElementById('speakEmbedToggle')?.checked || false;

      let embed = null;
      if (useEmbed) {
        const title = document.getElementById('speakEmbedTitle')?.value?.trim() || '';
        const url = document.getElementById('speakEmbedUrl')?.value?.trim() || '';
        const description = document.getElementById('speakEmbedDesc')?.value?.trim() || '';
        const color = document.getElementById('speakEmbedColor')?.value?.trim() || '#00E5FF';
        const authorName = document.getElementById('speakEmbedAuthorName')?.value?.trim() || '';
        const authorIcon = document.getElementById('speakEmbedAuthorIcon')?.value?.trim() || '';
        const image = document.getElementById('speakEmbedImage')?.value?.trim() || '';
        const thumbnail = document.getElementById('speakEmbedThumbnail')?.value?.trim() || '';
        const footerText = document.getElementById('speakEmbedFooterText')?.value?.trim() || '';
        const footerIcon = document.getElementById('speakEmbedFooterIcon')?.value?.trim() || '';

        const fields = [];
        document.querySelectorAll('#speakEmbedFieldsContainer .speak-field-row').forEach(row => {
          const name = row.querySelector('.speak-field-name')?.value?.trim();
          const value = row.querySelector('.speak-field-val')?.value?.trim();
          const inline = row.querySelector('.speak-field-inline')?.checked || false;
          if (name && value) {
            fields.push({ name, value, inline });
          }
        });

        if (title || description || fields.length > 0 || image || thumbnail) {
          embed = {
            title: title || undefined,
            url: url || undefined,
            description: description || undefined,
            color,
            author: authorName ? { name: authorName, icon: authorIcon || undefined } : undefined,
            footer: footerText ? { text: footerText, icon: footerIcon || undefined } : undefined,
            image: image || undefined,
            thumbnail: thumbnail || undefined,
            fields: fields.length > 0 ? fields : undefined
          };
        }
      }

      if (!content && !embed) {
        return alert('Digite uma mensagem de texto ou configure ao menos o título ou descrição da embed!');
      }

      const sendBtn = document.getElementById('sendBotMsgBtn');
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerText = '⏳ Enviando...';
      }

      try {
        const selectedBotId = document.getElementById('speakBotInstanceSelect')?.value || 'MAIN';
        const res = await saveModule('bot_speak', {
          botId: selectedBotId,
          channelId,
          content,
          embed
        });
        if (res && (res.status === 'success' || res.success || res.config?.success || res.messageId)) {
          const chanText = document.getElementById('speakChannelSelect')?.selectedOptions?.[0]?.text || '';
          showToast('Mensagem transmitida com sucesso no canal ' + chanText + '!', 'success', 'Transmitido!');
        }
      } catch (err) {
        console.error('Falha ao enviar mensagem:', err);
        showToast('Erro ao enviar mensagem: ' + (err.message || err), 'error', 'Erro no Envio');
      } finally {
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerText = '🚀 Transmitir Mensagem no Canal';
        }
      }
    });

    document.getElementById('clearBotMsgBtn')?.addEventListener('click', () => {
      document.getElementById('speakContentInput').value = '';
      document.getElementById('speakEmbedTitle').value = '';
      document.getElementById('speakEmbedUrl').value = '';
      document.getElementById('speakEmbedDesc').value = '';
      document.getElementById('speakEmbedAuthorName').value = '';
      document.getElementById('speakEmbedAuthorIcon').value = '';
      document.getElementById('speakEmbedImage').value = '';
      document.getElementById('speakEmbedThumbnail').value = '';
      document.getElementById('speakEmbedFooterText').value = '';
      document.getElementById('speakEmbedFooterIcon').value = '';
      document.getElementById('speakEmbedFieldsContainer').innerHTML = '';
      updateBotSpeakPreview();
    });

    // Button Bindings
    document.getElementById('saveTicketsBtn')?.addEventListener('click', () => {
      saveModule('tickets', {
        panelChannelId: document.getElementById('ticketPanelChannelSelect').value,
        panelTitle: document.getElementById('ticketPanelTitle').value,
        panelDescription: document.getElementById('ticketPanelDesc').value,
        transcriptChannelId: document.getElementById('ticketTranscriptChannelSelect').value,
        supportRoleId: document.getElementById('ticketSupportRoleSelect').value,
        maxOpenTicketsPerUser: parseInt(document.getElementById('ticketMaxInput').value, 10) || 3
      });
    });

    document.getElementById('saveWelcomeBtn')?.addEventListener('click', () => {
      saveModule('welcome', {
        channelId: document.getElementById('welcomeChannelSelect').value,
        welcomeMessageTemplate: document.getElementById('welcomeMsgInput').value
      });
    });

    document.getElementById('saveGoodbyeBtn')?.addEventListener('click', () => {
      saveModule('welcome', {
        goodbyeEnabled: document.getElementById('goodbyeEnabledSelect')?.value === 'true',
        goodbyeChannelId: document.getElementById('goodbyeChannelSelect')?.value || null,
        goodbyeMessage: document.getElementById('goodbyeMsgInput')?.value || ''
      });
    });

    function syncAntiSpamDurationState() {
      const act = document.getElementById('antiSpamActionSelect')?.value;
      const durGroup = document.getElementById('antiSpamDurationGroup');
      const durInput = document.getElementById('antiSpamTimeoutMinInput');
      if (durGroup && durInput) {
        const isTimeout = act === 'TIMEOUT';
        durGroup.style.opacity = isTimeout ? '1' : '0.45';
        durInput.disabled = !isTimeout;
      }
    }
    document.getElementById('antiSpamActionSelect')?.addEventListener('change', syncAntiSpamDurationState);
    syncAntiSpamDurationState();

    document.getElementById('saveAntiAbuseBtn')?.addEventListener('click', () => {
      saveModule('moderation', {
        antiAbuse: {
          antiSpamEnabled: document.getElementById('antiSpamEnabledSelect')?.value === 'true',
          maxMessagesPerInterval: parseInt(document.getElementById('antiSpamMaxMsgInput')?.value, 10) || 5,
          intervalSeconds: parseInt(document.getElementById('antiSpamIntervalInput')?.value, 10) || 5,
          antiFloodDuplicateThreshold: parseInt(document.getElementById('antiFloodThresholdInput')?.value, 10) || 3,
          actionOnDetection: document.getElementById('antiSpamActionSelect')?.value || 'TIMEOUT',
          timeoutDurationMinutes: parseInt(document.getElementById('antiSpamTimeoutMinInput')?.value, 10) || 5
        }
      });
    });

    document.getElementById('saveSocialBtn')?.addEventListener('click', async () => {
      await saveModule('social', {
        marriageEnabled: document.getElementById('socialMarriageEnabledSelect')?.value === 'true',
        marriageCost: parseInt(document.getElementById('socialMarriageCost')?.value, 10) || 5000,
        shippingEnabled: document.getElementById('socialShippingEnabledSelect')?.value === 'true',
        gifsEnabled: document.getElementById('socialGifsEnabledSelect')?.value === 'true',
        funCommandsEnabled: document.getElementById('socialFunCommandsEnabledSelect')?.value === 'true'
      });
    });

    document.getElementById('saveQuizBtn')?.addEventListener('click', async () => {
      await saveModule('quiz', {
        rewardCoins: parseInt(document.getElementById('quizRewardCoins')?.value, 10) || 200,
        rewardXp: parseInt(document.getElementById('quizRewardXp')?.value, 10) || 50,
        defaultRounds: parseInt(document.getElementById('quizDefaultRounds')?.value, 10) || 5,
        defaultTimeoutSeconds: parseInt(document.getElementById('quizTimeoutSeconds')?.value, 10) || 25,
        allowedChannelId: document.getElementById('quizAllowedChannelSelect')?.value || null
      });
    });

`;
};
