# Regras & Diretrizes do Assistente (Jarvis)

## 📌 REGRA CRÍTICA DE VERSIONAMENTO & DEPLOY CONTÍNUO
Toda vez que houver qualquer atualização, melhoria, nova funcionalidade ou correção de bug no bot:
1. **Incremento Obrigatório (+0.1):** Sempre verificar a última versão no `package.json` (ex: `v6.3` vira `v6.4`, `v6.4` vira `v6.5`, etc.).
2. **Atualização do `package.json`:** Atualizar o campo `"version"` (ex: `"6.4.0"`).
3. **Atualização do `CHANGELOG.md`:** Documentar as mudanças sob a nova versão com a data atual.
4. **Verificação de Testes:** Executar `npm test` e garantir 100% dos testes aprovados antes de enviar.
5. **Deploy Automático no GitHub:** Fazer o commit com a tag/versão correspondente e publicar no GitHub imediatamente via `npm run push` (script seguro `scripts/safe-push.ps1`).

## 🗺️ Mapa do Código
Antes de procurar qualquer funcionalidade, consulte `docs/CODEMAP.md` (fluxo painel → API → service → banco, regra PRIMARY vs instância Multi-Bot e índice de funcionalidades). Atualize o mapa sempre que mover/criar arquivos.
