param(
    [string]$Message = ""
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  JARVIS / CELL - SAFE GITHUB SYNC (ANTI-LEAK)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location "C:\Jarvis"

# 1. Verificar se o repositório git existe
if (-not (Test-Path ".git")) {
    Write-Host "[*] Inicializando repositório Git local..." -ForegroundColor Yellow
    git init -b main
}

# 2. Verificar se git user.name e user.email estao configurados
$gitUser = git config user.name
$gitEmail = git config user.email
if (-not $gitUser -or -not $gitEmail) {
    Write-Host "[!] Git user.name ou user.email nao configurados." -ForegroundColor Yellow
    Write-Host "Configure executando:" -ForegroundColor Yellow
    Write-Host "  git config --global user.name 'Seu Nome'" -ForegroundColor Gray
    Write-Host "  git config --global user.email 'seu@email.com'" -ForegroundColor Gray
    Exit 1
}

# 3. Adicionar arquivos e auditar arquivos preparados (Staging)
git add .

$stagedFiles = git diff --name-only --cached

# Lista de padroes proibidos (segredos, tokens, bancos SQLite, rascunhos)
$forbiddenPatterns = @(
    "^\.env($|\.(?!example|sample|template))",
    "^data/",
    "\.sqlite",
    "\.sqlite3",
    "\.db$",
    "scratch/",
    "node_modules/"
)

$hasForbidden = $false
foreach ($file in $stagedFiles) {
    # .env.example, sample ou template sao moldes com valores vazios e sao seguros
    if ($file -in @(".env.example", ".env.sample", ".env.template")) {
        continue
    }

    foreach ($pat in $forbiddenPatterns) {
        if ($file -match $pat) {
            Write-Host "[PERIGO] Arquivo sensivel detectado no commit: $file" -ForegroundColor Red
            $hasForbidden = $true
        }
    }
}

if ($hasForbidden) {
    Write-Host "`n[ABORTADO] Arquivos sensiveis detectados! Cancelando commit para proteger seus dados." -ForegroundColor Red
    git reset
    Exit 1
}

if ($stagedFiles) {
    Write-Host "[OK] Auditoria de seguranca concluida com sucesso! Nenhum dado sensivel detectado." -ForegroundColor Green
    Write-Host "[+] Arquivos que serao enviados:" -ForegroundColor Gray
    $stagedFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor DarkGray }

    # 4. Commit
    if (-not $Message) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $Message = "update: bot features & assets ($timestamp)"
    }

    git commit -m "$Message"
} else {
    Write-Host "[INFO] Sem novas alteracoes para commitar. Verificando envio ao GitHub..." -ForegroundColor Yellow
}

# 5. Tag Automática de Versão (baseada no package.json)
if (Test-Path "package.json") {
    try {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        $rawVer = $pkg.version
        if ($rawVer) {
            # Se a versao for 6.5.0, vira v6.5 (ou v6.5.0)
            $parts = $rawVer.Split(".")
            $tagVer = if ($parts.Length -ge 2) { "v" + $parts[0] + "." + $parts[1] } else { "v" + $rawVer }
            $existingTag = git tag -l $tagVer
            if (-not $existingTag) {
                Write-Host "[*] Criando tag de versao automatica: $tagVer" -ForegroundColor Cyan
                git tag -a $tagVer -m "Release $tagVer"
            }
        }
    } catch {
        Write-Host "[!] Nao foi possivel ler a versao do package.json para criar tag." -ForegroundColor Yellow
    }
}

# 6. Push para o GitHub (Branch + Tags)
$hasRemote = git remote
if (-not $hasRemote) {
    Write-Host "`n[AVISO] Nenhum repositorio remoto (GitHub) configurado ainda!" -ForegroundColor Yellow
    Write-Host "1. Crie seu repositorio PRIVADO no GitHub: https://github.com/new" -ForegroundColor Yellow
    Write-Host "2. Conecte com o comando:" -ForegroundColor Yellow
    Write-Host "   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git" -ForegroundColor Cyan
    Write-Host "3. Depois execute este script novamente para enviar!" -ForegroundColor Yellow
    Exit 0
}

Write-Host "`n[*] Enviando alteracoes e tags para o repositorio privado no GitHub..." -ForegroundColor Cyan
git push -u origin main
git push origin --tags

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCESSO] Projeto sincronizado com seguranca no seu GitHub Privado!" -ForegroundColor Green
} else {
    Write-Host "`n[ERRO] Ocorreu uma falha no git push. Verifique suas permissoes do GitHub." -ForegroundColor Red
}
