module.exports = (ctx) => {
  const {
    isUnlocked, aiDisplayName, botAvatarUrl, botAvatarDataUri, csrfToken, sessionToken,
    initialGuilds, initialServerName, initialServerIconUrl, initialUptimeStr,
    initialHeapUsedMb, initialMemberCount, initialServerId, botConfig, initialMultiBots,
    activeConfig, defaultTitle, pageTitle, brandBadge, escapeHtmlServer,
    serverBotOptionsHtml, serverSpeakBotOptionsHtml, renderedGuildOptions, effectiveFavicon
  } = ctx;
  return `    // ==========================================
    // QUIZ SUITE: CATEGORIES & QUESTIONS MANAGER
    // ==========================================
    window.editingQuizQuestionId = null;

    function normalizeQuizText(txt) {
      if (!txt) return '';
      return String(txt)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function renderQuizCategoriesSection() {
      const cats = window.quizCategories || {};
      const catEntries = Object.entries(cats);

      // 1. Populate customQuizCategory select
      const catSelect = document.getElementById('customQuizCategory');
      if (catSelect) {
        const currentVal = catSelect.value;
        catSelect.innerHTML = catEntries.map(function(item) {
          const key = item[0];
          const c = item[1];
          const emojiDisplay = (c.emoji && c.emoji.startsWith('http')) ? '🖼️' : (c.emoji || '📁');
          return '<option value="' + key + '">' + emojiDisplay + ' ' + (c.name || key) + '</option>';
        }).join('');
        if (currentVal && cats[currentVal]) {
          catSelect.value = currentVal;
        } else if (cats['geral']) {
          catSelect.value = 'geral';
        }
      }

      // 2. Populate quizFilterCategory select
      const filterSelect = document.getElementById('quizFilterCategory');
      if (filterSelect) {
        const currentFilter = filterSelect.value;
        filterSelect.innerHTML = '<option value="">📂 Todas as Categorias</option>' + catEntries.map(function(item) {
          const key = item[0];
          const c = item[1];
          const emojiDisplay = (c.emoji && c.emoji.startsWith('http')) ? '🖼️' : (c.emoji || '📁');
          return '<option value="' + key + '">' + emojiDisplay + ' ' + (c.name || key) + '</option>';
        }).join('');
        if (currentFilter) filterSelect.value = currentFilter;
      }

      // 3. Render badges in quizCategoriesBadgesContainer
      const badgesContainer = document.getElementById('quizCategoriesBadgesContainer');
      const countEl = document.getElementById('quizCategoriesCount');
      if (countEl) countEl.textContent = catEntries.length;

      if (badgesContainer) {
        if (catEntries.length === 0) {
          badgesContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Nenhuma categoria registrada.</div>';
          return;
        }

        badgesContainer.innerHTML = catEntries.map(function(item) {
          const key = item[0];
          const c = item[1];
          const isCustom = Boolean(c.isCustom);
          const color = c.color || '#5865F2';
          const iconHtml = (c.emoji && c.emoji.startsWith('http'))
            ? '<img src="' + c.emoji + '" style="width: 18px; height: 18px; border-radius: 3px; object-fit: cover; vertical-align: middle;" alt="Icon">'
            : '<span style="font-size: 1rem;">' + (c.emoji || '📁') + '</span>';
          const deleteBtn = isCustom
            ? '<button class="danger-btn delete-quiz-cat-btn" data-key="' + key + '" data-id="' + (c.id || '') + '" title="Excluir categoria" style="background: rgba(237,66,69,0.2); border: 1px solid rgba(237,66,69,0.4); color: #ED4245; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; cursor: pointer; margin-left: 0.4rem;">🗑️</button>'
            : '<span style="font-size: 0.7rem; background: rgba(88,101,242,0.15); color: #5865F2; padding: 0.1rem 0.35rem; border-radius: 3px; margin-left: 0.35rem;">Sistema</span>';

          return (
            '<div style="display: inline-flex; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid ' + color + '; border-radius: 20px; padding: 0.35rem 0.75rem; font-size: 0.82rem; gap: 0.4rem;" title="' + (c.description || c.name) + '">' +
              iconHtml +
              '<strong style="color: #fff;">' + c.name + '</strong>' +
              '<code style="font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.25); padding: 0.1rem 0.3rem; border-radius: 3px;">+' + key + '</code>' +
              deleteBtn +
            '</div>'
          );
        }).join('');

        badgesContainer.querySelectorAll('.delete-quiz-cat-btn').forEach(function(btn) {
          btn.addEventListener('click', async function() {
            const key = btn.getAttribute('data-key');
            const id = btn.getAttribute('data-id');
            const gId = currentGuildId || document.getElementById('guildSelector')?.value;
            if (!confirm('Deseja realmente excluir a categoria customizada "' + key + '"? As perguntas dela não serão sorteadas mais.')) return;
            try {
              const res = await fetch('/api/guilds/' + gId + '/quiz/categories/' + id, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
              });
              if (!res.ok) throw new Error('Falha ao deletar categoria.');
              if (window.quizCategories) delete window.quizCategories[key];
              renderQuizCategoriesSection();
              renderAllQuizQuestions();
              showToast('Categoria customizada removida com sucesso!', 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        });
      }
    }

    function checkQuizDuplicateQuestion(currentText) {
      const warningBox = document.getElementById('quizDuplicateWarning');
      const warningText = document.getElementById('quizDuplicateWarningText');
      if (!warningBox || !warningText) return;

      const norm = normalizeQuizText(currentText);
      if (!norm || norm.length < 5) {
        warningBox.style.display = 'none';
        return;
      }

      const allList = window.allQuizQuestionsList || [];
      const cats = window.quizCategories || {};
      let duplicateFound = null;

      for (let i = 0; i < allList.length; i++) {
        const item = allList[i];
        if (window.editingQuizQuestionId && String(item.id) === String(window.editingQuizQuestionId)) {
          continue;
        }
        const itemNorm = normalizeQuizText(item.question);
        if (itemNorm === norm) {
          duplicateFound = { match: 'exato', item: item };
          break;
        }
        if (norm.length > 12 && itemNorm.length > 12) {
          if (itemNorm.includes(norm) || norm.includes(itemNorm)) {
            duplicateFound = { match: 'muito parecido', item: item };
            break;
          }
        }
      }

      if (duplicateFound) {
        const catObj = cats[duplicateFound.item.category] || {};
        const catName = catObj.name || duplicateFound.item.category;
        const originLabel = duplicateFound.item.isCustom ? '⭐ Pergunta Customizada do Servidor' : '🤖 Pergunta Oficial do Sistema';
        warningBox.style.display = 'block';
        warningText.innerHTML = 'Encontrado match ' + duplicateFound.match + ': <em>"' + duplicateFound.item.question + '"</em> na categoria <strong>' + catName + '</strong> (' + originLabel + '). Modifique o enunciado para evitar duplicatas!';
      } else {
        warningBox.style.display = 'none';
      }
    }

    function handleQuizImgError(img) {
      if (!img) return;
      img.onerror = null;
      var box = img.parentElement;
      if (box) {
        box.innerHTML = '<div style="padding:0.75rem; text-align:center; color:var(--text-muted); font-size:0.76rem;">⚠️ Não foi possível carregar a animação externa</div>';
      }
    }

    function renderAllQuizQuestions() {
      const container = document.getElementById('allQuizQuestionsContainer');
      const visibleCountEl = document.getElementById('quizCountVisible');
      const totalCountEl = document.getElementById('quizCountTotal');
      if (!container) return;

      const allList = window.allQuizQuestionsList || [];
      const cats = window.quizCategories || {};
      if (totalCountEl) totalCountEl.textContent = allList.length;

      const qTerm = normalizeQuizText(document.getElementById('quizSearchInput')?.value || '');
      const catFilter = document.getElementById('quizFilterCategory')?.value || '';
      const origFilter = document.getElementById('quizFilterOrigin')?.value || 'all';

      const filtered = allList.filter(function(q) {
        if (catFilter && q.category !== catFilter) return false;
        if (origFilter === 'custom' && !q.isCustom) return false;
        if (origFilter === 'system' && q.isCustom) return false;

        if (qTerm) {
          const qTextNorm = normalizeQuizText(q.question);
          const qAnsNorm = normalizeQuizText((Array.isArray(q.answers) ? q.answers.join(' ') : q.answers) || '');
          const qExpNorm = normalizeQuizText(q.explanation || '');
          const qCatNorm = normalizeQuizText(q.category || '');
          const qCatNameNorm = normalizeQuizText(q.categoryName || (cats[q.category]?.name || ''));
          const matches = qTextNorm.includes(qTerm) ||
                          qAnsNorm.includes(qTerm) ||
                          qExpNorm.includes(qTerm) ||
                          qCatNorm.includes(qTerm) ||
                          qCatNameNorm.includes(qTerm);
          if (!matches) return false;
        }
        return true;
      });

      if (visibleCountEl) visibleCountEl.textContent = filtered.length;

      if (filtered.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.88rem; padding: 1.5rem; text-align: center; border: 1px dashed rgba(255,255,255,0.08); border-radius: 8px;">Nenhuma pergunta encontrada com os filtros aplicados. Tente ajustar os termos de busca!</div>';
        return;
      }

      container.innerHTML = filtered.map(function(q) {
        const cat = cats[q.category] || { name: q.category, emoji: '📁', color: '#5865F2' };
        const iconHtml = (cat.emoji && cat.emoji.startsWith('http'))
          ? '<img src="' + cat.emoji + '" style="width: 16px; height: 16px; border-radius: 3px; object-fit: cover; vertical-align: middle;"> '
          : (cat.emoji || '📁') + ' ';

        const originBadge = q.isCustom
          ? '<span style="font-size: 0.72rem; background: rgba(241,196,15,0.15); color: #F1C40F; border: 1px solid rgba(241,196,15,0.3); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600;">⭐ Servidor</span>'
          : '<span style="font-size: 0.72rem; background: rgba(88,101,242,0.15); color: #5865F2; border: 1px solid rgba(88,101,242,0.3); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600;">🤖 Oficial</span>';

        const imgInsideExplanation = q.imageUrl
          ? ('<div class="quiz-img-container" style="margin-top: 0.65rem; max-width: 460px;">' +
              '<div class="quiz-img-box" style="border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.35); box-shadow: 0 4px 14px rgba(0,0,0,0.4);">' +
                '<img src="' + q.imageUrl + '" style="width: 100%; height: auto; max-height: 260px; object-fit: contain; display: block;" alt="GIF da Resposta" loading="lazy" onerror="handleQuizImgError(this);">' +
              '</div>' +
              '<div style="margin-top: 0.35rem; display: flex; align-items: center; justify-content: space-between;">' +
                '<span style="font-size: 0.72rem; color: #38bdf8;">🎬 Animação Oficial da Resposta</span>' +
                '<a href="' + q.imageUrl + '" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: var(--text-muted); text-decoration: underline;">Abrir original em tela cheia ↗</a>' +
              '</div>' +
             '</div>')
          : '';

        const answersList = Array.isArray(q.answers) ? q.answers : [q.answers];
        const answersPills = answersList.map(function(ans) {
          return '<span class="quiz-spoiler" title="Clique para revelar / ocultar resposta"><span class="quiz-spoiler-text">' + ans + '</span></span>';
        }).join('');

        const actionsHtml = q.isCustom
          ? ('<div style="display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0;">' +
              '<button class="secondary-btn edit-quiz-q-btn" data-id="' + q.id + '" style="height: 28px; padding: 0 0.7rem; font-size: 0.76rem; border-radius: 6px;">✏️ Editar</button>' +
              '<button class="danger-btn delete-quiz-q-btn" data-id="' + q.id + '" style="height: 28px; padding: 0 0.7rem; font-size: 0.76rem; border-radius: 6px;">🗑️ Excluir</button>' +
             '</div>')
          : ('<div style="display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0;">' +
              '<button class="secondary-btn edit-quiz-q-btn" data-id="' + q.id + '" style="height: 28px; padding: 0 0.7rem; font-size: 0.76rem; border-radius: 6px;" title="Editar e personalizar esta pergunta oficial">✏️ Editar</button>' +
              '<span style="font-size: 0.72rem; color: var(--text-muted); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.25rem 0.55rem; border-radius: 6px; flex-shrink: 0;">🔒 Padrão Jarvis</span>' +
             '</div>');

        return (
          '<div style="display: flex; align-items: flex-start; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem 1rem; gap: 1rem;">' +
            '<div style="flex: 1; min-width: 0;">' +
              '<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">' +
                '<span style="font-size: 0.75rem; background: rgba(255,255,255,0.06); color: #fff; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: bold;">#' + q.id + '</span>' +
                originBadge +
                '<span style="font-size: 0.76rem; background: rgba(255,255,255,0.04); border: 1px solid ' + (cat.color || 'rgba(255,255,255,0.1)') + '; padding: 0.15rem 0.45rem; border-radius: 12px; color: #fff;">' + iconHtml + cat.name + '</span>' +
              '</div>' +
              '<div style="font-weight: 600; font-size: 0.92rem; margin-bottom: 0.35rem; color: #ffffff; word-break: break-word;">' + q.question + '</div>' +
              '<div style="margin-bottom: 0.35rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem;"><span style="font-size: 0.76rem; color: var(--text-muted); margin-right: 0.25rem;">Respostas:</span>' + answersPills + '</div>' +
              (q.explanation ? (
                '<div style="font-size: 0.8rem; line-height: 1.35; margin-top: 0.35rem; display: flex; align-items: flex-start; gap: 0.35rem; flex-wrap: wrap;">' +
                  '<span style="color: var(--text-muted); font-size: 0.76rem; flex-shrink: 0; padding-top: 0.1rem;">💡 Explicação:</span>' +
                  '<span class="quiz-spoiler quiz-explanation-spoiler" title="Clique para revelar / ocultar a explicação pós-resposta">' +
                    '<span class="quiz-spoiler-text">' +
                      q.explanation +
                      imgInsideExplanation +
                    '</span>' +
                  '</span>' +
                '</div>'
              ) : (q.imageUrl ? (
                '<div style="font-size: 0.8rem; line-height: 1.35; margin-top: 0.35rem; display: flex; align-items: flex-start; gap: 0.35rem; flex-wrap: wrap;">' +
                  '<span style="color: var(--text-muted); font-size: 0.76rem; flex-shrink: 0; padding-top: 0.1rem;">💡 Foto da Resposta:</span>' +
                  '<span class="quiz-spoiler quiz-explanation-spoiler" title="Clique para revelar / ocultar a foto da resposta">' +
                    '<span class="quiz-spoiler-text">' + imgInsideExplanation + '</span>' +
                  '</span>' +
                '</div>'
              ) : '')) +
            '</div>' +
            actionsHtml +
          '</div>'
        );
      }).join('');

      // Wire Spoiler Click Toggle
      container.querySelectorAll('.quiz-spoiler').forEach(function(sp) {
        sp.addEventListener('click', function() {
          sp.classList.toggle('revealed');
        });
      });

      // Wire Edit Buttons
      container.querySelectorAll('.edit-quiz-q-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const id = btn.getAttribute('data-id');
          const target = allList.find(function(item) { return String(item.id) === String(id); });
          if (!target) return;

          window.editingQuizQuestionId = target.id;
          window.editingQuizQuestionIsCustom = Boolean(target.isCustom);
          if (document.getElementById('customQuizCategory')) document.getElementById('customQuizCategory').value = target.category;
          if (document.getElementById('customQuizQuestion')) document.getElementById('customQuizQuestion').value = target.question;
          if (document.getElementById('customQuizAnswers')) {
            document.getElementById('customQuizAnswers').value = Array.isArray(target.answers) ? target.answers.join(', ') : target.answers;
          }
          if (document.getElementById('customQuizExplanation')) document.getElementById('customQuizExplanation').value = target.explanation || '';
          if (document.getElementById('customQuizImageUrl')) document.getElementById('customQuizImageUrl').value = target.imageUrl || '';

          const banner = document.getElementById('quizEditBanner');
          const label = document.getElementById('editingQuestionIdLabel');
          const title = document.getElementById('quizFormTitle');
          const addBtn = document.getElementById('addCustomQuizQuestionBtn');
          const saveBtn = document.getElementById('saveEditQuizQuestionBtn');
          const cancelBtn = document.getElementById('cancelEditQuizQuestionBtn');

          if (banner) banner.style.display = 'flex';
          if (label) label.textContent = '#' + target.id + (target.isCustom ? '' : ' (Personalizando pergunta padrão)');
          if (title) title.innerHTML = '✏️ Editar Pergunta #' + target.id;
          if (addBtn) addBtn.style.display = 'none';
          if (saveBtn) saveBtn.style.display = 'inline-block';
          if (cancelBtn) cancelBtn.style.display = 'inline-block';

          const warnBox = document.getElementById('quizDuplicateWarning');
          if (warnBox) warnBox.style.display = 'none';
          document.getElementById('quizQuestionEditorSection')?.scrollIntoView({ behavior: 'smooth' });
        });
      });

      // Wire Delete Buttons
      container.querySelectorAll('.delete-quiz-q-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          const id = btn.getAttribute('data-id');
          const gId = currentGuildId || document.getElementById('guildSelector')?.value;
          if (!confirm('Deseja realmente excluir a pergunta #' + id + '?')) return;
          try {
            const res = await fetch('/api/guilds/' + gId + '/quiz/custom/' + id, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Erro ao deletar pergunta.');
            window.currentCustomQuizQuestions = (window.currentCustomQuizQuestions || []).filter(function(item) {
              return String(item.id) !== String(id);
            });
            window.allQuizQuestionsList = (window.allQuizQuestionsList || []).filter(function(item) {
              return String(item.id) !== String(id);
            });
            renderAllQuizQuestions();
            showToast('Pergunta excluída com sucesso!', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });
    }

    function resetQuizQuestionForm() {
      window.editingQuizQuestionId = null;
      window.editingQuizQuestionIsCustom = false;
      if (document.getElementById('customQuizQuestion')) document.getElementById('customQuizQuestion').value = '';
      if (document.getElementById('customQuizAnswers')) document.getElementById('customQuizAnswers').value = '';
      if (document.getElementById('customQuizExplanation')) document.getElementById('customQuizExplanation').value = '';
      if (document.getElementById('customQuizImageUrl')) document.getElementById('customQuizImageUrl').value = '';

      const banner = document.getElementById('quizEditBanner');
      const title = document.getElementById('quizFormTitle');
      const addBtn = document.getElementById('addCustomQuizQuestionBtn');
      const saveBtn = document.getElementById('saveEditQuizQuestionBtn');
      const cancelBtn = document.getElementById('cancelEditQuizQuestionBtn');
      const warnBox = document.getElementById('quizDuplicateWarning');

      if (banner) banner.style.display = 'none';
      if (title) title.innerHTML = '➕ Cadastrar Nova Pergunta';
      if (addBtn) addBtn.style.display = 'inline-block';
      if (saveBtn) saveBtn.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (warnBox) warnBox.style.display = 'none';
    }

    // Input listener for real-time duplicate detection
    document.getElementById('customQuizQuestion')?.addEventListener('input', function(e) {
      checkQuizDuplicateQuestion(e.target.value);
    });

    // Add Question
    document.getElementById('addCustomQuizQuestionBtn')?.addEventListener('click', async function() {
      const gId = currentGuildId || document.getElementById('guildSelector')?.value;
      const category = document.getElementById('customQuizCategory')?.value || 'geral';
      const question = document.getElementById('customQuizQuestion')?.value?.trim();
      const answers = document.getElementById('customQuizAnswers')?.value?.trim();
      const explanation = document.getElementById('customQuizExplanation')?.value?.trim();
      const imageUrl = document.getElementById('customQuizImageUrl')?.value?.trim() || null;

      if (!question || !answers || !explanation) {
        showToast('Preencha a pergunta, as respostas aceitas e a explicação!', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/guilds/' + gId + '/quiz/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: category, question: question, answers: answers, explanation: explanation, imageUrl: imageUrl })
        });
        if (!res.ok) {
          const errData = await res.json().catch(function() { return {}; });
          throw new Error(errData.message || 'Falha ao cadastrar pergunta.');
        }
        const data = await res.json();
        if (data.question) {
          window.currentCustomQuizQuestions = window.currentCustomQuizQuestions || [];
          window.currentCustomQuizQuestions.unshift(data.question);
          window.allQuizQuestionsList = window.allQuizQuestionsList || [];
          window.allQuizQuestionsList.unshift(data.question);
          renderAllQuizQuestions();
        }
        resetQuizQuestionForm();
        showToast('Pergunta customizada cadastrada com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Save Edit Question
    document.getElementById('saveEditQuizQuestionBtn')?.addEventListener('click', async function() {
      if (!window.editingQuizQuestionId) return;
      const gId = currentGuildId || document.getElementById('guildSelector')?.value;
      const category = document.getElementById('customQuizCategory')?.value || 'geral';
      const question = document.getElementById('customQuizQuestion')?.value?.trim();
      const answers = document.getElementById('customQuizAnswers')?.value?.trim();
      const explanation = document.getElementById('customQuizExplanation')?.value?.trim();
      const imageUrl = document.getElementById('customQuizImageUrl')?.value?.trim() || null;

      if (!question || !answers || !explanation) {
        showToast('Preencha a pergunta, as respostas aceitas e a explicação!', 'warning');
        return;
      }

      try {
        const isCustom = window.editingQuizQuestionIsCustom;
        let res;
        if (isCustom) {
          res = await fetch('/api/guilds/' + gId + '/quiz/custom/' + window.editingQuizQuestionId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category, question: question, answers: answers, explanation: explanation, imageUrl: imageUrl })
          });
        } else {
          // Editing an official question creates a customized override for this server
          res = await fetch('/api/guilds/' + gId + '/quiz/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category, question: question, answers: answers, explanation: explanation, imageUrl: imageUrl })
          });
        }

        if (!res.ok) {
          const errData = await res.json().catch(function() { return {}; });
          throw new Error(errData.message || 'Falha ao salvar alterações da pergunta.');
        }
        const data = await res.json();
        if (data.question) {
          const oldId = window.editingQuizQuestionId;
          window.currentCustomQuizQuestions = window.currentCustomQuizQuestions || [];
          if (isCustom) {
            const idxCustom = window.currentCustomQuizQuestions.findIndex(function(i) { return String(i.id) === String(oldId); });
            if (idxCustom !== -1) window.currentCustomQuizQuestions[idxCustom] = data.question;
            else window.currentCustomQuizQuestions.unshift(data.question);
          } else {
            window.currentCustomQuizQuestions.unshift(data.question);
          }

          window.allQuizQuestionsList = window.allQuizQuestionsList || [];
          const idxAll = window.allQuizQuestionsList.findIndex(function(i) { return String(i.id) === String(oldId); });
          if (idxAll !== -1) {
            window.allQuizQuestionsList[idxAll] = data.question;
          } else {
            window.allQuizQuestionsList.unshift(data.question);
          }
          renderAllQuizQuestions();
        }
        resetQuizQuestionForm();
        showToast('Pergunta salva com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Cancel Edit Buttons
    document.getElementById('cancelEditQuizQuestionBtn')?.addEventListener('click', resetQuizQuestionForm);
    document.getElementById('cancelEditQuizQuestionTopBtn')?.addEventListener('click', resetQuizQuestionForm);

    // Add Custom Category
    document.getElementById('addCustomQuizCatBtn')?.addEventListener('click', async function() {
      const gId = currentGuildId || document.getElementById('guildSelector')?.value;
      const name = document.getElementById('customQuizCatName')?.value?.trim();
      const rawKey = document.getElementById('customQuizCatKey')?.value?.trim();
      const emoji = document.getElementById('customQuizCatEmoji')?.value?.trim() || '📁';
      const color = document.getElementById('customQuizCatColor')?.value || '#5865F2';
      const description = document.getElementById('customQuizCatDesc')?.value?.trim() || '';

      if (!name) {
        showToast('Informe o nome da categoria!', 'warning');
        return;
      }
      const key = (rawKey || name).toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
      if (!key) {
        showToast('A chave/slug da categoria é inválida!', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/guilds/' + gId + '/quiz/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, key: key, emoji: emoji, color: color, description: description })
        });
        if (!res.ok) {
          const errData = await res.json().catch(function() { return {}; });
          throw new Error(errData.message || 'Falha ao criar categoria.');
        }
        const data = await res.json();
        if (data.category) {
          window.quizCategories = window.quizCategories || {};
          window.quizCategories[data.category.key] = data.category;
          renderQuizCategoriesSection();
          renderAllQuizQuestions();
        }
        document.getElementById('customQuizCatName').value = '';
        document.getElementById('customQuizCatKey').value = '';
        document.getElementById('customQuizCatEmoji').value = '';
        document.getElementById('customQuizCatDesc').value = '';
        showToast('Categoria "' + name + '" criada com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Search and Filter Listeners
    document.getElementById('quizSearchInput')?.addEventListener('input', renderAllQuizQuestions);
    document.getElementById('quizFilterCategory')?.addEventListener('change', renderAllQuizQuestions);
    document.getElementById('quizFilterOrigin')?.addEventListener('change', renderAllQuizQuestions);

    // Toggle All Quiz Spoilers Button
    document.getElementById('toggleAllQuizSpoilersBtn')?.addEventListener('click', function() {
      const spoilers = document.querySelectorAll('#allQuizQuestionsContainer .quiz-spoiler');
      const allRevealed = Array.from(spoilers).length > 0 && Array.from(spoilers).every(function(s) { return s.classList.contains('revealed'); });
      spoilers.forEach(function(s) {
        if (allRevealed) {
          s.classList.remove('revealed');
        } else {
          s.classList.add('revealed');
        }
      });
      const btn = document.getElementById('toggleAllQuizSpoilersBtn');
      if (btn) {
        btn.innerHTML = allRevealed ? '👁️ Revelar Respostas' : '🙈 Ocultar Respostas';
      }
    });

    if (typeof renderQuizCategoriesSection === 'function') renderQuizCategoriesSection();
    if (typeof renderAllQuizQuestions === 'function') renderAllQuizQuestions();

`;
};
