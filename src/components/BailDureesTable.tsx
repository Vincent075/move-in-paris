type Row = { label: string; courtMoyen: string; longTerme: string };

const ROWS: Row[] = [
  {
    label: "Durée du bail",
    courtMoyen: "1 à 12 mois",
    longTerme: "12 mois à 3 ans+",
  },
  {
    label: "Frais côté propriétaire",
    courtMoyen: "0 € — service 100 % gratuit",
    longTerme: "0 € — service 100 % gratuit",
  },
  {
    label: "Frais côté locataire (entreprise)",
    courtMoyen: "0 € — service 100 % gratuit",
    longTerme: "12,5 % HT du loyer annuel",
  },
  {
    label: "Dépôt de garantie",
    courtMoyen: "Non requis",
    longTerme: "2 mois de loyer, intégralement reversés au propriétaire",
  },
  {
    label: "Assistance technique 7j/7",
    courtMoyen: "Incluse, sans frais (locataire et propriétaire)",
    longTerme: "Incluse, sans frais (locataire et propriétaire)",
  },
  {
    label: "Préavis de sortie entreprise",
    courtMoyen: "15 jours",
    longTerme: "3 mois (préavis bail société)",
  },
  {
    label: "Idéal pour",
    courtMoyen: "Missions, audits, intégrations, due diligence, consultants, expats en mobilité courte",
    longTerme: "Mutations 1-3 ans, logement de fonction, dirigeants expatriés, familles internationales",
  },
];

export default function BailDureesTable() {
  return (
    <div className="my-8 not-prose">
      <div className="hidden md:block overflow-x-auto rounded-sm border border-gris-clair/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-noir-deep text-blanc">
              <th className="text-left p-4 font-medium uppercase text-xs tracking-wider w-1/4">
                Bail société
              </th>
              <th className="text-left p-4 font-medium uppercase text-xs tracking-wider bg-gold/95 text-noir-deep">
                Court &amp; moyen terme
              </th>
              <th className="text-left p-4 font-medium uppercase text-xs tracking-wider bg-gold/80 text-noir-deep">
                Long terme
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={r.label} className={i % 2 === 0 ? "bg-blanc" : "bg-blanc-chaud"}>
                <td className="p-4 font-medium text-noir border-t border-gris-clair/50 align-top">{r.label}</td>
                <td className="p-4 text-noir border-t border-gris-clair/50 bg-gold/5 align-top">{r.courtMoyen}</td>
                <td className="p-4 text-noir border-t border-gris-clair/50 align-top">{r.longTerme}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-6">
        {ROWS.map((r) => (
          <div key={r.label} className="border border-gris-clair/60 rounded-sm overflow-hidden">
            <div className="bg-noir-deep text-blanc px-4 py-2 font-medium text-xs uppercase tracking-wider">
              {r.label}
            </div>
            <div className="bg-gold/10 px-4 py-3 border-b border-gris-clair/50">
              <div className="text-xs uppercase tracking-wider text-gold mb-1">Court &amp; moyen terme</div>
              <div className="text-sm text-noir">{r.courtMoyen}</div>
            </div>
            <div className="px-4 py-3 bg-blanc">
              <div className="text-xs uppercase tracking-wider text-gris mb-1">Long terme</div>
              <div className="text-sm text-noir">{r.longTerme}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gris mt-4 italic text-center">
        Le service Move in Paris est toujours 100 % gratuit pour le propriétaire — quelle que soit la durée du bail.
      </p>
    </div>
  );
}
