# ============================================================================
# Brownie-se — deploy inicial em 1 comando.
#
# Como usar:
#   1. Botao direito neste arquivo → "Executar com PowerShell"
#      OU no PowerShell: cd C:\Users\erick\stoque ; .\deploy.ps1
#   2. Quando pedir login do GitHub, autorize no navegador que abrir.
#   3. Ao final, siga o link que ele imprimir para conectar na Vercel.
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Brownie-se — deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Sanity checks ------------------------------------------------------
if (-not (Test-Path "package.json")) {
  Write-Host "ERRO: rode este script dentro de C:\Users\erick\stoque" -ForegroundColor Red
  Read-Host "Pressione Enter para sair"
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "ERRO: git nao esta instalado." -ForegroundColor Red
  Write-Host "Instale via https://git-scm.com/download/win" -ForegroundColor Yellow
  Read-Host "Pressione Enter para sair"
  exit 1
}

# --- 2. Guarantee .env.local nao vai pro commit ----------------------------
$gitignoreContent = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
if (-not ($gitignoreContent -match "\.env\*")) {
  Write-Host "AVISO: .gitignore nao esta ignorando .env*. Abortando por seguranca." -ForegroundColor Red
  Read-Host "Pressione Enter para sair"
  exit 1
}

# --- 3. Limpa .git quebrado -------------------------------------------------
Write-Host "[1/6] Limpando .git anterior..." -ForegroundColor Cyan
if (Test-Path ".git") {
  # Remove atributos hidden/readonly que atrapalham o rm
  attrib -r -h -s .git\* /s /d 2>$null
  Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
}

# --- 4. Inicializa git ------------------------------------------------------
Write-Host "[2/6] git init..." -ForegroundColor Cyan
git init -b main | Out-Null
git config user.email "spatzidiomasacademy@gmail.com"
git config user.name  "Viana"

# --- 5. Confere que .env.local nao vai pro commit ---------------------------
Write-Host "[3/6] Verificando que .env.local esta ignorado..." -ForegroundColor Cyan
$envInGit = git check-ignore -q .env.local; $envIgnored = ($LASTEXITCODE -eq 0)
if (-not $envIgnored) {
  Write-Host "ERRO: .env.local NAO esta sendo ignorado pelo git! Verifique .gitignore." -ForegroundColor Red
  Read-Host "Pressione Enter para sair"
  exit 1
}

# --- 6. Commit inicial ------------------------------------------------------
Write-Host "[4/6] git add + commit inicial..." -ForegroundColor Cyan
git add . | Out-Null
git commit -m "chore: primeiro commit do Brownie-se" | Out-Null

# --- 7. Remoto --------------------------------------------------------------
Write-Host "[5/6] Adicionando remote origin..." -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin "https://github.com/browniesebakerybrasil-pixel/Stoque-App.git"

# --- 8. Push (pode abrir navegador para autorizacao GitHub) -----------------
Write-Host "[6/6] Enviando para o GitHub..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  >> Se abrir uma janela do navegador pedindo login do GitHub," -ForegroundColor Yellow
Write-Host "     autorize o Git Credential Manager." -ForegroundColor Yellow
Write-Host ""
try {
  git push -u origin main --force
} catch {
  Write-Host ""
  Write-Host "ERRO no push. Comum:" -ForegroundColor Red
  Write-Host "  - Repositorio nao existe: crie em https://github.com/new (privado, sem README) e rode de novo." -ForegroundColor Yellow
  Write-Host "  - Sem autorizacao: instale/atualize o Git for Windows para ter o Credential Manager." -ForegroundColor Yellow
  Read-Host "Pressione Enter para sair"
  exit 1
}

# --- 9. Sucesso -------------------------------------------------------------
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Codigo publicado no GitHub!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo passo: subir na Vercel para ter uma URL publica." -ForegroundColor Cyan
Write-Host ""
Write-Host "  1) Abra: https://vercel.com/new" -ForegroundColor White
Write-Host "  2) Login com GitHub (mesma conta browniesebakerybrasil-pixel)" -ForegroundColor White
Write-Host "  3) Import Git Repository -> Stoque-App" -ForegroundColor White
Write-Host "  4) Framework: Next.js (auto)" -ForegroundColor White
Write-Host "  5) Environment Variables: cole TODAS do .env.local" -ForegroundColor White
Write-Host "  6) Clique Deploy. Espere ~2 min." -ForegroundColor White
Write-Host ""
Write-Host "Depois disso voce recebe uma URL tipo https://stoque-app-xyz.vercel.app" -ForegroundColor White
Write-Host "e pode abrir em qualquer dispositivo (PC, iPad, celular)." -ForegroundColor White
Write-Host ""

Start-Process "https://vercel.com/new"
Read-Host "Pressione Enter para fechar"
