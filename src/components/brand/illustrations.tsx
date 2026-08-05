/**
 * Ilustrações da landing — estilo Notion-like.
 *
 * Convenção visual:
 *   - viewBox 240 × 180
 *   - traço primário: navy (#0c3c59) com stroke-width 2
 *   - destaques: gold (#d9a441) e brown (#ad7039)
 *   - fundos suaves: cream-50 (#faf3e6)
 *   - "live": verde (#22c55e) para indicar dado em tempo real
 *
 * Todas as ilustrações são acessíveis (aria-hidden) — o card que as envolve
 * já carrega título e descrição textual.
 */

interface IllustrationProps {
  className?: string;
}

const NAVY = "#0c3c59";
const BROWN = "#ad7039";
const GOLD = "#d9a441";
const CREAM = "#f2e7d5";
const CREAM_50 = "#faf3e6";
const SLATE_300 = "#94a3af";
const GREEN = "#22c55e";

/** Pilha de fichas técnicas com indicador "ao vivo". */
export function IllustrationLiveRecipe({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Card 3 — fundo, levemente rotacionado */}
      <g transform="rotate(6 145 105)">
        <rect
          x="85"
          y="45"
          width="120"
          height="120"
          rx="10"
          fill={CREAM_50}
          stroke={CREAM}
          strokeWidth="1.5"
        />
      </g>
      {/* Card 2 — meio */}
      <g transform="rotate(-3 130 95)">
        <rect
          x="70"
          y="35"
          width="120"
          height="120"
          rx="10"
          fill="#ffffff"
          stroke={SLATE_300}
          strokeWidth="1.5"
        />
        <rect x="82" y="50" width="50" height="5" rx="2" fill={SLATE_300} />
        <rect x="82" y="65" width="80" height="3" rx="1.5" fill={CREAM} />
        <rect x="82" y="74" width="70" height="3" rx="1.5" fill={CREAM} />
      </g>
      {/* Card 1 — frente */}
      <rect
        x="40"
        y="30"
        width="135"
        height="135"
        rx="12"
        fill="#ffffff"
        stroke={NAVY}
        strokeWidth="2"
      />
      {/* Cabeçalho do card */}
      <rect x="55" y="48" width="70" height="6" rx="2" fill={NAVY} />
      <rect x="55" y="62" width="42" height="3" rx="1.5" fill={SLATE_300} />
      {/* Lista de ingredientes */}
      <g>
        <rect x="55" y="82" width="6" height="6" rx="1.5" fill={CREAM} />
        <rect x="67" y="83" width="80" height="4" rx="2" fill={SLATE_300} />
        <rect x="55" y="96" width="6" height="6" rx="1.5" fill={CREAM} />
        <rect x="67" y="97" width="60" height="4" rx="2" fill={SLATE_300} />
        <rect x="55" y="110" width="6" height="6" rx="1.5" fill={CREAM} />
        <rect x="67" y="111" width="74" height="4" rx="2" fill={SLATE_300} />
      </g>
      {/* CMV em destaque */}
      <rect
        x="55"
        y="130"
        width="105"
        height="22"
        rx="6"
        fill={CREAM_50}
        stroke={BROWN}
        strokeWidth="1.5"
      />
      <rect x="63" y="138" width="22" height="6" rx="2" fill={NAVY} />
      <rect x="120" y="137" width="32" height="8" rx="2" fill={GOLD} />
      {/* Indicador "ao vivo" — bolinha verde com halo */}
      <circle cx="160" cy="50" r="11" fill={GREEN} fillOpacity="0.18" />
      <circle cx="160" cy="50" r="5" fill={GREEN} />
    </svg>
  );
}

/** Etiqueta de preço com seta de margem. */
export function IllustrationPricing({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Etiqueta inclinada */}
      <g transform="rotate(-8 120 90)">
        {/* Sombra suave */}
        <path
          d="M 65 60 L 65 145 Q 65 152 72 152 L 175 152 Q 182 152 182 145 L 182 70 L 165 50 L 72 50 Q 65 50 65 60 Z"
          fill={CREAM_50}
        />
        {/* Etiqueta */}
        <path
          d="M 60 55 L 60 140 Q 60 147 67 147 L 170 147 Q 177 147 177 140 L 177 65 L 160 45 L 67 45 Q 60 45 60 55 Z"
          fill="#ffffff"
          stroke={NAVY}
          strokeWidth="2"
        />
        {/* Furo do prendedor */}
        <circle
          cx="155"
          cy="62"
          r="6"
          fill={CREAM_50}
          stroke={NAVY}
          strokeWidth="2"
        />
        {/* "R$" e número grande */}
        <text
          x="75"
          y="103"
          fontFamily="DM Serif Display, Georgia, serif"
          fontSize="34"
          fill={NAVY}
        >
          R$
        </text>
        <text
          x="115"
          y="103"
          fontFamily="DM Serif Display, Georgia, serif"
          fontSize="34"
          fill={BROWN}
        >
          29,90
        </text>
        {/* Linha base */}
        <rect x="75" y="118" width="90" height="3" rx="1.5" fill={CREAM} />
        {/* Linha pequena (CMV) */}
        <rect x="75" y="128" width="50" height="3" rx="1.5" fill={SLATE_300} />
      </g>
      {/* Seta de margem subindo */}
      <g>
        <path
          d="M 192 130 Q 200 100 210 70"
          stroke={GOLD}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 204 60 L 210 70 L 220 64"
          stroke={GOLD}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="190"
          y="155"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontSize="11"
          fontWeight="600"
          fill={NAVY}
        >
          margem
        </text>
      </g>
    </svg>
  );
}

/** Gráfico de barras com indicadores de canal. */
export function IllustrationChannels({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Eixo base */}
      <line
        x1="30"
        y1="135"
        x2="210"
        y2="135"
        stroke={SLATE_300}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Linhas-guia horizontais (tracejadas) */}
      <line
        x1="30"
        y1="100"
        x2="210"
        y2="100"
        stroke={CREAM}
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <line
        x1="30"
        y1="65"
        x2="210"
        y2="65"
        stroke={CREAM}
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      {/* Barra Balcão */}
      <rect x="48" y="55" width="32" height="80" rx="6" fill={NAVY} />
      <rect x="48" y="55" width="32" height="14" rx="6" fill={GOLD} />
      {/* Barra WhatsApp */}
      <rect x="100" y="80" width="32" height="55" rx="6" fill={BROWN} />
      <rect x="100" y="80" width="32" height="10" rx="6" fill={GOLD} />
      {/* Barra iFood */}
      <rect x="152" y="40" width="32" height="95" rx="6" fill={NAVY} />
      <rect x="152" y="40" width="32" height="22" rx="6" fill={BROWN} />
      {/* Pontos-canais (legenda) */}
      <g>
        <circle cx="64" cy="155" r="4" fill={NAVY} />
        <circle cx="116" cy="155" r="4" fill={BROWN} />
        <circle cx="168" cy="155" r="4" fill={NAVY} />
      </g>
      {/* Etiqueta "líquido vs taxa" */}
      <g>
        <rect
          x="142"
          y="22"
          width="72"
          height="20"
          rx="10"
          fill="#ffffff"
          stroke={NAVY}
          strokeWidth="1.5"
        />
        <circle cx="153" cy="32" r="3" fill={GOLD} />
        <text
          x="160"
          y="36"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontSize="9"
          fontWeight="600"
          fill={NAVY}
        >
          taxa canal
        </text>
      </g>
    </svg>
  );
}
