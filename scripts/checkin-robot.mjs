// Robot Check-in & notifications — Move in Paris
// Toutes les 15 min (GitHub Actions) :
//   1. Résa en Booking validé / Contrat envoyé / Contrat signé, sans check-in lié,
//      arrivée aujourd'hui ou à venir → crée le Check-in en « À planifier ».
//   2. Check-in « À planifier » dont Date + Heure + Collaborateur sont remplis
//      → passe en « Planifié ».
//   3. Notifications Slack : tout Check-in dont le statut a changé depuis le
//      dernier passage → message dans #check-in (création comprise). Tout Lead
//      dont le statut a changé → message dans #leads (la création des leads est
//      déjà notifiée en direct par le site — le robot ne la répète pas).
//      Mémoire d'état : champ « Dernier statut notifié » sur chaque table.
// Idempotent : filtres anti-doublon + marqueurs ; en cas de panne, rattrapage
// automatique au passage suivant.
// Spec : maquette-cockpit-interne/TABLE-CHECKIN-SPEC.md

const TOKEN = process.env.AIRTABLE_ROBOT_TOKEN;
const WH_CHECKIN = process.env.SLACK_CHECKIN_WEBHOOK_URL;
const WH_LEADS = process.env.SLACK_LEADS_WEBHOOK_URL;
const BASE = "appcLt70GQiR1FAbT";
const T_RESA = "tbl5uN32egP4YCvUi"; // Réservations
const T_CHK = "tbl8SktZKbyopdQ7l"; // Check-in
const T_LEADS = "tblUxEm8sB4eHyNG1"; // Leads

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

async function slack(webhook, lines) {
  if (!lines.length) return;
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: lines.join("\n") }),
  });
  if (!res.ok) throw new Error(`Slack → ${res.status} ${await res.text()}`);
}

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
const frDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

// ── 1. Créer les check-ins manquants ─────────────────────────────────────────
const resas = await listAll(T_RESA, {
  filterByFormula:
    "AND(" +
    "OR(Statut='Booking validé',Statut='Contrat envoyé',Statut='Contrat signé',Statut='En cours')," +
    "{Check-in lié}=BLANK()," +
    "IS_AFTER({Date d'entrée},DATEADD(TODAY(),-1,'days'))" +
    ")",
  "fields[]": ["Code réservation", "Appartement"],
});
console.log(`${resas.length} résa(s) validée(s) sans check-in`);

for (let i = 0; i < resas.length; i += 10) {
  const slice = resas.slice(i, i + 10);
  await api(`${BASE}/${T_CHK}`, {
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
  slice.forEach((r) => console.log(`  + check-in créé pour ${r.fields["Code réservation"]}`));
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

// ── 3a. Notifications #check-in (créations + changements de statut) ──────────
if (!WH_CHECKIN) {
  console.log("SLACK_CHECKIN_WEBHOOK_URL absent — notifications check-in sautées (marqueurs conservés).");
} else {
  const changes = await listAll(T_CHK, {
    filterByFormula: "{Statut}!={Dernier statut notifié}",
    "fields[]": [
      "Code check-in", "Statut", "Dernier statut notifié", "Nom occupant",
      "Adresse appartement", "Début du bail (résa)", "Date du check-in",
      "Heure du check-in", "Collaborateur",
    ],
  });
  console.log(`${changes.length} changement(s) de statut check-in à notifier`);
  const lines = changes.map((r) => {
    const f = r.fields;
    const code = f["Code check-in"];
    const occ = first(f["Nom occupant"]);
    const statut = f.Statut ?? "";
    if (!f["Dernier statut notifié"])
      return `🆕 *${code}* créé — ${occ} · arrivée ${frDate(first(f["Début du bail (résa)"]))} · ${first(f["Adresse appartement"])}`;
    if (statut === "Planifié")
      return `📅 *${code}* → *Planifié* — ${frDate(f["Date du check-in"])} à ${f["Heure du check-in"] ?? "?"} · ${f.Collaborateur?.name ?? ""}`;
    if (statut === "Terminé") return `✅ *${code}* → *Terminé* — ${occ}`;
    if (statut === "Annulé") return `🚫 *${code}* → *Annulé* — ${occ}`;
    return `🔄 *${code}* → *${statut}* — ${occ}`;
  });
  await slack(WH_CHECKIN, lines);
  for (let i = 0; i < changes.length; i += 10) {
    const slice = changes.slice(i, i + 10);
    await api(`${BASE}/${T_CHK}`, {
      method: "PATCH",
      body: {
        records: slice.map((r) => ({
          id: r.id,
          fields: { "Dernier statut notifié": r.fields.Statut ?? "" },
        })),
      },
    });
  }
  if (changes.length) console.log("  notifications #check-in envoyées, marqueurs à jour");
}

// ── 3b. Notifications #leads (changements de statut uniquement) ──────────────
if (!WH_LEADS) {
  console.log("SLACK_LEADS_WEBHOOK_URL absent — notifications leads sautées (marqueurs conservés).");
} else {
  const changes = await listAll(T_LEADS, {
    filterByFormula: "{Statut}!={Dernier statut notifié}",
    "fields[]": ["Code lead", "Statut", "Dernier statut notifié", "Prénom", "Nom", "Source formulaire"],
  });
  console.log(`${changes.length} changement(s) de statut lead`);
  const lines = changes
    .filter((r) => r.fields["Dernier statut notifié"]) // création déjà notifiée en direct par le site
    .map((r) => {
      const f = r.fields;
      const qui = [f["Prénom"], f["Nom"]].filter(Boolean).join(" ");
      const statut = f.Statut ?? "";
      const emoji = statut === "Signé" ? "🎉" : statut === "Perdu" ? "❌" : "🔄";
      return `${emoji} *${f["Code lead"]}* → *${statut}* — ${qui} · ${f["Source formulaire"] ?? ""}`;
    });
  await slack(WH_LEADS, lines);
  for (let i = 0; i < changes.length; i += 10) {
    const slice = changes.slice(i, i + 10);
    await api(`${BASE}/${T_LEADS}`, {
      method: "PATCH",
      body: {
        records: slice.map((r) => ({
          id: r.id,
          fields: { "Dernier statut notifié": r.fields.Statut ?? "" },
        })),
      },
    });
  }
  if (changes.length) console.log("  notifications #leads envoyées, marqueurs à jour");
}

console.log("Robot terminé sans erreur.");
