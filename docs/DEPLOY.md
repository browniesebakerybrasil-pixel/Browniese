# Deploy do Stoque

Passo a passo para hospedar o Stoque em produção: GitHub + Vercel.

---

## Parte 1 — Subir o projeto pro GitHub

### 1.1. Limpar o `.git` quebrado (se existir)

O sandbox tentou criar um `.git` mas não conseguiu finalizar. Antes de qualquer coisa, **abra o PowerShell ou Git Bash do Windows** dentro de `C:\Users\erick\stoque` e rode:

```powershell
# PowerShell — remove .git quebrado, se houver
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
```

### 1.2. Inicializar o repositório

```powershell
cd C:\Users\erick\stoque

git init -b main
git config user.email "spatzidiomasacademy@gmail.com"
git config user.name "Viana"
```

### 1.3. Conferir que `.env.local` está fora do commit

```powershell
git status --short | Select-String "\.env"
```

Deve aparecer **apenas** `.env.example` (o `.env.local` é ignorado pelo `.gitignore`). Se o `.env.local` aparecer na lista, o gitignore está errado — **não prossiga**.

### 1.4. Primeiro commit

```powershell
git add .
git commit -m "feat: mvp completo do Stoque (auth, materias, insumos, fichas, pedidos, relatorios, stripe)"
```

### 1.5. Criar o repositório no GitHub

#### Opção A — GitHub CLI (recomendada, mais rápida)

```powershell
# Uma vez: instalar o gh e logar
winget install --id GitHub.cli
gh auth login

# Criar e enviar
gh repo create stoque --private --source . --remote origin --push
```

#### Opção B — via UI do GitHub

1. Abra https://github.com/new
2. Repository name: `stoque`
3. **Private** (recomendado — esse código é seu)
4. **Não** marque "Initialize with README" (já temos)
5. Clique "Create repository"
6. Volte ao PowerShell e rode os comandos que o GitHub mostra, no estilo:

```powershell
git remote add origin https://github.com/<seu-usuario>/stoque.git
git push -u origin main
```

---

## Parte 2 — Deploy na Vercel

### 2.1. Importar o repo

1. Abra https://vercel.com/new
2. Importe o repositório `stoque` do GitHub
3. Framework Preset: **Next.js** (auto-detectado)
4. Root Directory: `./` (raiz)
5. Build Command: `npm run build` (default)
6. Install Command: `npm install` (default)

### 2.2. Variáveis de ambiente

Antes de clicar "Deploy", expanda **Environment Variables** e cole **todas** as chaves abaixo, com os mesmos valores do `.env.local`:

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (mantenha secreta) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys |
| `CLERK_SECRET_KEY` | idem |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/onboarding` |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks (após configurar — ver 2.5) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → API keys |
| `STRIPE_SECRET_KEY` | idem |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks (ver 2.4) |
| `NEXT_PUBLIC_STRIPE_PRICE_BASICO` | Stripe → produto Básico |
| `NEXT_PUBLIC_STRIPE_PRICE_FULL` | idem Full |
| `NEXT_PUBLIC_STRIPE_PRICE_MASTER` | idem Master |
| `NEXT_PUBLIC_APP_URL` | preencha **depois** do primeiro deploy, com a URL final (ex.: `https://stoque.vercel.app`) — depois redeploy |

### 2.3. Primeiro deploy

Clique **Deploy**. Vai demorar ~2 min na primeira vez.

Se falhar com erro de build, role pra cima e procure a linha que aponta o arquivo — provavelmente alguma env var ficou faltando. Adicione, salve e clique "Redeploy".

### 2.4. Webhook do Stripe (produção)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://<seu-domínio-vercel>/api/webhooks/stripe`
3. Eventos a escutar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Após criar, abra o endpoint e copie o **Signing secret** (`whsec_...`)
5. Cole em `STRIPE_WEBHOOK_SECRET` no painel da Vercel → redeploy

### 2.5. Webhook do Clerk (opcional)

Se quiser que a criação de organização seja síncrona com o sign-up via Clerk:

1. Clerk Dashboard → **Webhooks → Add endpoint**
2. URL: `https://<seu-domínio-vercel>/api/webhooks/clerk`
3. Subscribe a `user.created` e `user.deleted`
4. Copie o signing secret e cole em `CLERK_WEBHOOK_SECRET` na Vercel → redeploy

*(Sem isso, o fluxo continua funcionando — a Server Action do `/onboarding` cria a organização na primeira interação do usuário com o produto.)*

### 2.6. Atualizar URLs no Clerk

No Clerk → Configure → **Paths**, garanta que estão apontando para o seu domínio em produção (ou use os defaults `/sign-in`, `/sign-up`, etc., já configurados via env var).

### 2.7. Aplicar o schema no Supabase de produção

Se você usou o mesmo projeto Supabase de dev, está pronto. Caso tenha criado um projeto separado de prod, abra o SQL Editor e rode `supabase/schema.sql` lá também.

---

## Parte 3 — Atualizações futuras

```powershell
cd C:\Users\erick\stoque
git add .
git commit -m "feat: <descrição>"
git push
```

A Vercel detecta o push e faz o redeploy automaticamente.

---

## Checklist final antes do "vai pra prod"

- [ ] `.env.local` **não** está no GitHub (rodou `git status` antes do primeiro commit)
- [ ] Schema do Supabase aplicado em produção
- [ ] 3 produtos Stripe criados em produção (modo Live, não Test) e Price IDs atualizados
- [ ] Webhook do Stripe apontando para a URL de prod com `whsec_` correto
- [ ] `NEXT_PUBLIC_APP_URL` aponta para o domínio definitivo
- [ ] Chaves do Clerk são as de produção (`pk_live_...` e `sk_live_...`), não as de teste

Bom deploy!
