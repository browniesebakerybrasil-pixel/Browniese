# Stoque

SaaS de gestão interna para food service: hamburguerias, confeitarias, lanchonetes, restaurantes e deliveries. Foco em **precificação correta, controle de CMV e relatório de resultado** — em tempo real e em cascata.

> Atualize uma matéria prima, veja o CMV de todas as fichas se ajustar.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript estrito**
- **Tailwind CSS v4** com tokens de design via CSS (`@theme inline`)
- **Supabase** (PostgreSQL + RLS por `clerk_user_id`)
- **Clerk** para autenticação
- **Stripe** para assinaturas (Básico R$97 / Full R$147 / Master R$247)
- **Zod** para validação de formulários
- **node:test + tsx** para testes unitários (sem Jest)

---

## Arquitetura em uma linha

```
matérias primas  ─►  insumos  ─►  fichas técnicas  ─►  pedidos
       │                │                │                │
       └─ custo / g     └─ custo / kg    └─ CMV %         └─ líquido por canal
```

Quando uma matéria prima muda, o serviço `lib/services/recalculate.ts` propaga: matéria → insumos → fichas. Conversão de unidades (g↔kg, ml↔l) acontece no app, não no banco.

---

## Setup local

### 1. Pré-requisitos

- Node.js 20 ou superior
- Conta no [Supabase](https://supabase.com), [Clerk](https://clerk.com) e [Stripe](https://stripe.com) (todos têm tier gratuito)

### 2. Clonar e instalar

```bash
git clone <repo>
cd stoque
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# preencha as credenciais de Supabase, Clerk e Stripe
```

### 4. Aplicar o schema do banco

No SQL Editor do Supabase, cole o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e execute. Isso cria 11 tabelas, índices, GENERATED columns para custo por unidade, triggers de `updated_at` e RLS por `clerk_user_id`.

### 5. Criar produtos no Stripe

No dashboard do Stripe (modo teste), crie 3 produtos recorrentes em BRL:

| Plano  | Preço/mês |
|--------|-----------|
| Básico | R$ 97     |
| Full   | R$ 147    |
| Master | R$ 247    |

Cole os `price_...` IDs em `.env.local`:

```env
NEXT_PUBLIC_STRIPE_PRICE_BASICO=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_FULL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_MASTER=price_xxx
```

### 6. Configurar webhook do Stripe (dev)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Cole o `whsec_...` impresso em `STRIPE_WEBHOOK_SECRET`.

### 7. (Opcional) Webhook do Clerk

No dashboard do Clerk, crie um webhook apontando para `https://<seu-host>/api/webhooks/clerk`, copie o signing secret para `CLERK_WEBHOOK_SECRET`. Sem isso o fluxo funciona — a Server Action do onboarding já cria a organização.

### 8. Rodar

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint
npm run test         # testes unitários dos cálculos
```

---

## Módulos por plano

### Básico (R$ 97/mês)
- Matérias primas e insumos ilimitados
- Até 50 fichas técnicas
- Canais de venda
- Pedidos manuais
- Dashboard básico
- Até 2 usuários

### Full (R$ 147/mês)
- Tudo do Básico
- Fichas técnicas ilimitadas
- Relatório diário completo
- Exportação CSV
- Até 5 usuários

### Master (R$ 247/mês)
- Tudo do Full
- Financeiro operacional (custos fixos mensais)
- Multi-unidades (planejado)
- Usuários ilimitados

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/                  rotas de sign-in / sign-up (Clerk)
│   ├── (dashboard)/             rotas do produto com sidebar
│   │   ├── canais/
│   │   ├── configuracoes/
│   │   ├── dashboard/
│   │   ├── fichas-tecnicas/
│   │   ├── financeiro/          (gating Master)
│   │   ├── insumos/
│   │   ├── materias-primas/
│   │   ├── pedidos/
│   │   ├── planos/
│   │   └── relatorios/          (gating Full+)
│   ├── api/
│   │   ├── relatorios/diario.csv/  exportação CSV
│   │   └── webhooks/{clerk,stripe}/
│   ├── onboarding/
│   └── layout.tsx
├── components/
│   ├── ui/                      Button, Input, Card, Table primitives
│   └── <modulo>/                componentes específicos de cada módulo
├── lib/
│   ├── auth/organization.ts     getOrganization / requireOrganization / stub
│   ├── services/recalculate.ts  cascata matéria → insumo → ficha
│   ├── stripe/client.ts         getStripe() lazy + price IDs + labels
│   ├── supabase/                client / server / admin / middleware
│   ├── utils.ts                 cn, formatadores, cálculos críticos
│   └── validation.ts            schemas Zod centralizados
├── types/index.ts               tipos de domínio
└── middleware.ts                Clerk middleware
supabase/schema.sql              schema completo (rodar uma vez)
```

---

## Regras de cálculo (resumo)

**Matéria prima**
```
custo_efetivo = (custo_total / quantidade) × (1 + desperdício/100)
```

**Insumo**
```
custo_total = Σ (custo_efetivo_materia × quantidade_convertida)
custo_unidade = custo_total / rendimento
```

**Ficha técnica**
```
custo_total      = ingredientes + gás + energia + embalagem + mão_de_obra + outros
cmv_%            = custo_total / preço_venda × 100
markup           = 1 / (1 - margem_desejada/100)
preço_sugerido   = custo_total × markup
```

**Pedido**
```
líquido = bruto × (1 - taxa_canal/100)
```

Todas as fórmulas estão em `src/lib/utils.ts` com testes em `src/lib/__tests__/utils.test.ts`.

---

## Deploy na Vercel

1. Push o repositório para o GitHub
2. No dashboard da Vercel, importe o repo (Framework Preset = Next.js, auto-detectado)
3. Cole **todas** as variáveis de `.env.example` no painel "Environment Variables", preenchendo com os valores reais
4. Em `NEXT_PUBLIC_APP_URL`, use o domínio definitivo do projeto (ex.: `https://stoque.vercel.app`)
5. Deploy
6. Após o primeiro deploy:
   - Atualize o endpoint do webhook do Stripe no dashboard para `https://<seu-domínio>/api/webhooks/stripe` e cole o novo `whsec_...` na env var
   - Faça o mesmo no Clerk para `/api/webhooks/clerk`

---

## Scripts

| Comando            | O que faz                                 |
|--------------------|-------------------------------------------|
| `npm run dev`      | Servidor de desenvolvimento               |
| `npm run build`    | Build de produção                         |
| `npm run start`    | Servir o build                            |
| `npm run lint`     | ESLint                                    |
| `npm run typecheck`| `tsc --noEmit`                            |
| `npm run test`     | Testes unitários dos cálculos críticos    |

---

## Licença

Privado — todos os direitos reservados.
