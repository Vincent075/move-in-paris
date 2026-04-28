type Row = { label: string; societe: string; mobilite: string; codeCivil: string };

const ROWS: Row[] = [
  { label: "Locataire", societe: "Personne morale (SAS, SARL, SCI…)", mobilite: "Personne physique en mobilité", codeCivil: "Personne morale ou physique" },
  { label: "Durée minimale", societe: "Libre (1 mois à 3 ans+)", mobilite: "1 à 10 mois (non renouvelable)", codeCivil: "Libre, par accord" },
  { label: "Encadrement loyer", societe: "Non concerné", mobilite: "Soumis (loyer de référence)", codeCivil: "Non concerné" },
  { label: "Dépôt de garantie", societe: "Non requis < 9 mois", mobilite: "Interdit", codeCivil: "Libre, par accord" },
  { label: "Préavis sortie", societe: "15 jours (entreprise)", mobilite: "1 mois (locataire)", codeCivil: "Selon contrat" },
  { label: "Facturation", societe: "Au nom de la société", mobilite: "Au nom du locataire physique", codeCivil: "Au choix" },
  { label: "Déductibilité IS", societe: "Oui (charge externe)", mobilite: "Non (locataire physique)", codeCivil: "Selon usage du bien" },
  { label: "Idéal pour", societe: "Salariés en mission, expatriés, dirigeants", mobilite: "Étudiants, stagiaires, mutations courtes", codeCivil: "Logement de fonction, usage mixte" },
];

export default function BailComparisonTable() {
  return (
    <div className="my-8 not-prose">
      <div className="hidden md:block overflow-x-auto rounded-sm border border-gris-clair/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-noir-deep text-blanc">
              <th className="text-left p-4 font-medium uppercase text-xs tracking-wider">Critère</th>
              <th className="text-left p-4 font-medium uppercase text-xs tracking-wider bg-gold/95 text-noir-deep">
                Bail société
              </th>
              <th className="text-left p-4 font-medium uppercase text-xs tracking-wider">Bail mobilité</th>
              <th className="text-left p-4 font-medium uppercase text-xs tracking-wider">Bail Code civil</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr
                key={r.label}
                className={i % 2 === 0 ? "bg-blanc" : "bg-blanc-chaud"}
              >
                <td className="p-4 font-medium text-noir border-t border-gris-clair/50">{r.label}</td>
                <td className="p-4 text-noir border-t border-gris-clair/50 bg-gold/5 font-medium">{r.societe}</td>
                <td className="p-4 text-gris border-t border-gris-clair/50">{r.mobilite}</td>
                <td className="p-4 text-gris border-t border-gris-clair/50">{r.codeCivil}</td>
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
              <div className="text-xs uppercase tracking-wider text-gold mb-1">Bail société</div>
              <div className="text-sm text-noir font-medium">{r.societe}</div>
            </div>
            <div className="px-4 py-3 border-b border-gris-clair/50 bg-blanc">
              <div className="text-xs uppercase tracking-wider text-gris mb-1">Bail mobilité</div>
              <div className="text-sm text-noir">{r.mobilite}</div>
            </div>
            <div className="px-4 py-3 bg-blanc-chaud">
              <div className="text-xs uppercase tracking-wider text-gris mb-1">Bail Code civil</div>
              <div className="text-sm text-noir">{r.codeCivil}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gris mt-4 italic text-center">
        Tableau indicatif — consultez votre conseiller Move in Paris pour identifier le bail adapté à votre situation.
      </p>
    </div>
  );
}
