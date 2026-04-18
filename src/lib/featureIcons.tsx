import type { ReactNode } from "react";

const SVG = ({ children }: { children: ReactNode }) => (
  <svg
    className="w-4 h-4 text-gold flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const Wifi = () => (
  <SVG>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </SVG>
);

const Tv = () => (
  <SVG>
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17 2 12 7 7 2" />
  </SVG>
);

const WashingMachine = () => (
  <SVG>
    <rect x="3" y="2" width="18" height="20" rx="2" />
    <circle cx="12" cy="13" r="5" />
    <path d="M12 18a5 5 0 0 0 5-5" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="10" y1="6" x2="10.01" y2="6" />
  </SVG>
);

const Utensils = () => (
  <SVG>
    <path d="M3 2v7c0 1.1.9 2 2 2h2v11" />
    <path d="M7 2v20" />
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </SVG>
);

const ChefHat = () => (
  <SVG>
    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
    <line x1="6" y1="17" x2="18" y2="17" />
  </SVG>
);

const Microwave = () => (
  <SVG>
    <rect x="2" y="4" width="20" height="15" rx="2" />
    <rect x="6" y="8" width="8" height="7" />
    <path d="M18 8v7" />
    <path d="M6 19v2" />
    <path d="M18 19v2" />
  </SVG>
);

const Refrigerator = () => (
  <SVG>
    <path d="M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
    <path d="M5 10h14" />
    <path d="M9 5v3" />
    <path d="M9 13v3" />
  </SVG>
);

const Coffee = () => (
  <SVG>
    <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </SVG>
);

const Wind = () => (
  <SVG>
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
  </SVG>
);

const Shirt = () => (
  <SVG>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  </SVG>
);

const Snowflake = () => (
  <SVG>
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="m20 16-4-4 4-4" />
    <path d="m4 8 4 4-4 4" />
    <path d="m16 4-4 4-4-4" />
    <path d="m8 20 4-4 4 4" />
  </SVG>
);

const Flame = () => (
  <SVG>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </SVG>
);

const Elevator = () => (
  <SVG>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="m8 10 4-4 4 4" />
    <path d="m8 14 4 4 4-4" />
  </SVG>
);

const Keypad = () => (
  <SVG>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <circle cx="9" cy="7" r=".5" />
    <circle cx="12" cy="7" r=".5" />
    <circle cx="15" cy="7" r=".5" />
    <circle cx="9" cy="11" r=".5" />
    <circle cx="12" cy="11" r=".5" />
    <circle cx="15" cy="11" r=".5" />
    <circle cx="9" cy="15" r=".5" />
    <circle cx="12" cy="15" r=".5" />
    <circle cx="15" cy="15" r=".5" />
  </SVG>
);

const Phone = () => (
  <SVG>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </SVG>
);

const Shield = () => (
  <SVG>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </SVG>
);

const Box = () => (
  <SVG>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </SVG>
);

const Car = () => (
  <SVG>
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
    <circle cx="6.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </SVG>
);

const Trees = () => (
  <SVG>
    <path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z" />
    <path d="M7 16v6" />
    <path d="M13 19h6" />
    <path d="M16 19v3" />
    <path d="M16 13a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-3v-3Z" />
    <path d="M16 13V6" />
  </SVG>
);

const Square = () => (
  <SVG>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 3v18" />
  </SVG>
);

const Window = () => (
  <SVG>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 12h18" />
    <path d="M12 3v18" />
  </SVG>
);

const Blinds = () => (
  <SVG>
    <path d="M3 3h18" />
    <path d="M20 7H8" />
    <path d="M20 11H8" />
    <path d="M10 19h10" />
    <path d="M8 15h12" />
    <path d="M4 3v14" />
    <circle cx="4" cy="19" r="2" />
  </SVG>
);

const Toilet = () => (
  <SVG>
    <path d="M7 12h10l-1 7H8l-1-7z" />
    <path d="M5 12h14" />
    <path d="M9 12V6a3 3 0 0 1 6 0v6" />
  </SVG>
);

const Bath = () => (
  <SVG>
    <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <line x1="10" y1="5" x2="8" y2="7" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="7" y1="19" x2="7" y2="21" />
    <line x1="17" y1="19" x2="17" y2="21" />
  </SVG>
);

const Shower = () => (
  <SVG>
    <path d="M4 4 2.5 5.5" />
    <path d="M19 14a6 6 0 0 0-12 0" />
    <line x1="13" y1="2" x2="13" y2="6" />
    <line x1="13" y1="14" x2="13" y2="14.01" />
    <line x1="9" y1="17" x2="9" y2="17.01" />
    <line x1="13" y1="20" x2="13" y2="20.01" />
    <line x1="17" y1="17" x2="17" y2="17.01" />
  </SVG>
);

const Bed = () => (
  <SVG>
    <path d="M2 4v16" />
    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
    <path d="M2 17h20" />
    <path d="M6 8v9" />
  </SVG>
);

const Sofa = () => (
  <SVG>
    <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
    <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z" />
    <path d="M4 18v2" />
    <path d="M20 18v2" />
    <path d="M12 4v9" />
  </SVG>
);

const Check = () => (
  <SVG>
    <path d="M4.5 12.75l6 6 9-13.5" />
  </SVG>
);

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const RULES: { match: string[]; component: () => React.JSX.Element }[] = [
  { match: ["wifi", "fibre", "internet"], component: Wifi },
  { match: ["tv", "television", "smart tv"], component: Tv },
  { match: ["lave-linge sechant"], component: WashingMachine },
  { match: ["lave-linge", "seche-linge", "machine a laver"], component: WashingMachine },
  { match: ["lave-vaisselle", "vaisselle"], component: Utensils },
  { match: ["four", "cuisine equipee"], component: ChefHat },
  { match: ["micro-onde", "microonde"], component: Microwave },
  { match: ["refrigerateur", "frigo", "congelateur"], component: Refrigerator },
  { match: ["nespresso", "cafetiere", "bouilloire", "cafe"], component: Coffee },
  { match: ["plaques de cuisson", "plaque", "induction", "gaz"], component: ChefHat },
  { match: ["toaster", "grille-pain"], component: ChefHat },
  { match: ["aspirateur", "seche-cheveux", "ventil"], component: Wind },
  { match: ["fer a repasser", "table a repasser", "linge", "draps", "serviettes"], component: Shirt },
  { match: ["climatisation", "clim"], component: Snowflake },
  { match: ["chauffage"], component: Flame },
  { match: ["ascenseur"], component: Elevator },
  { match: ["digicode", "code"], component: Keypad },
  { match: ["interphone"], component: Phone },
  { match: ["gardien", "concierge", "securit"], component: Shield },
  { match: ["cave", "rangement", "stockage"], component: Box },
  { match: ["parking", "garage"], component: Car },
  { match: ["balcon", "terrasse", "jardin"], component: Trees },
  { match: ["double vitrage", "vitrage", "fenetre"], component: Window },
  { match: ["volets"], component: Blinds },
  { match: ["toilettes", "wc"], component: Toilet },
  { match: ["baignoire"], component: Bath },
  { match: ["douche"], component: Shower },
  { match: ["lit", "queen", "king"], component: Bed },
  { match: ["canape", "fauteuil", "salon"], component: Sofa },
  { match: ["parquet", "carrelage", "moquette"], component: Square },
];

export function getFeatureIcon(feature: string): React.JSX.Element {
  const n = normalize(feature);
  for (const rule of RULES) {
    if (rule.match.some((m) => n.includes(m))) return rule.component();
  }
  return <Check />;
}
