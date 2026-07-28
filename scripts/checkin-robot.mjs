// Robot Check-in — Move in Paris
// Toutes les 15 min (GitHub Actions) :
//   1. Résa en Booking validé / Contrat envoyé / Contrat signé, sans check-in lié,
//      arrivée aujourd'hui ou à venir → crée le Check-in en « À planifier ».
//   2. Check-in « À planifier » dont Date + Heure + Collaborateur sont remplis
//      → passe en « Planifié ».
// Idempotent : le filtre « sans check-in lié » sert d'anti-doublon et de rattrapage.
// Spec : maquette-cockpit-interne/TABLE-CHECKIN-SPEC.md

const TOKEN = process.env.AIRTABLE_ROBOT_TOKEN;
const BASE = "appcLt70GQiR1FAbT";
const T_RESA = "tbl5uN32egP4YCvUi"; // Réservations
const T_CHK = "tbl8SktZKbyopdQ7l"; // Check-in

if (!TOKEN) {
  console.error("AIRTABLE_ROBOT_TOKEN manquant — abandon.");
  process.exit(1);
}

async function api(path, { method = "GET", params, body } = {}) {
  const url = new URL(`https://api.airtable.com/v0/${path}`);
  if (params)
    for (const [k, v] of Object.entries(params))
      (Array.isArray(v) ? v : [v]).forEach((x) => url.searchParams.append(k, x));
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function listAll(table, params) {
  const records = [];
  let offset;
  do {
    const page = await api(`${BASE}/${table}`, {
      params: { ...params, ...(offset ? { offset } : {}) },
    });
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

// ── 1. Créer les check-ins manquants ─────────────────────────────────────────
const resas = await listAll(T_RESA, {
  filterByFormula:
    "AND(" +
    "OR(Statut='Booking validé',Statut='Contrat envoyé',Statut='Contrat signé')," +
    "{Check-in lié}=BLANK()," +
    "IS_AFTER({Date d'entrée},DATEADD(TODAY(),-1,'days'))" +
    ")",
  "fields[]": ["Code réservation", "Appartement"],
});
console.log(`${resas.length} résa(s) validée(s) sans check-in`);

for (let i = 0; i < resas.length; i += 10) {
  const slice = resas.slice(i, i + 10);
  const out = await api(`${BASE}/${T_CHK}`, {
    method: "POST",
    body: {
      records: slice.map((r) => ({
        fields: {
          "Réservation liée": [r.id],
          Appartement: r.fields.Appartement ?? [],
          Statut: "À planifier",
        },
      })),
      typecast: true,
    },
  });
  out.records.forEach((_, j) =>
    console.log(`  + check-in créé pour ${slice[j].fields["Code réservation"]}`)
  );
}

// ── 2. Passer en « Planifié » les check-ins complets ─────────────────────────
const complets = await listAll(T_CHK, {
  filterByFormula:
    "AND(Statut='À planifier',{Date du check-in},{Heure du check-in}!='',{Collaborateur}!='')",
  "fields[]": ["Code check-in"],
});
console.log(`${complets.length} check-in(s) complet(s) → Planifié`);

for (let i = 0; i < complets.length; i += 10) {
  const slice = complets.slice(i, i + 10);
  await api(`${BASE}/${T_CHK}`, {
    method: "PATCH",
    body: { records: slice.map((r) => ({ id: r.id, fields: { Statut: "Planifié" } })) },
  });
  slice.forEach((r) => console.log(`  → ${r.fields["Code check-in"]} passé en Planifié`));
}

console.log("Robot terminé sans erreur.");
