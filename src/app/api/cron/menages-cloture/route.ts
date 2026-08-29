import { NextResponse } from "next/server";

// Clôture automatique des ménages — une fois par jour, 8h Paris.
//
// Pourquoi (29/08/2026, demande de Vincent) : la table Ménages n'était jamais
// soldée. 101 ménages sur 101 en « Planifié », dont 61 à date passée remontant au
// 22 juin. Les équipes passent nettoyer mais ne cochent pas dans Airtable, si bien
// qu'on ne pouvait plus distinguer ce qui restait à faire de ce qui était fait
// depuis deux mois, et que les compteurs « ménages du jour » étaient illisibles.
//
// LA RÈGLE : un ménage encore « Planifié » plus de 48 h après sa date prévue passe
// en « Terminé ». 48 h et pas 24 : c'est le délai pour qu'un dégât ou un problème
// soit signalé sur la fiche avant qu'elle ne se referme.
//
// LA TRACE, qui compte autant que la clôture : chaque fiche fermée ainsi reçoit une
// note horodatée disant que personne n'a confirmé. Sans elle, la table dirait
// « Terminé » partout et affirmerait quelque chose que personne n'a vérifié — on
// aurait remplacé une table inutilisable par une table qui ment. La note permet de
// retrouver, plus tard, ce qui a été réellement constaté et ce qui a été supposé.
//
// Ce cron ne touche jamais un ménage futur, ni un ménage déjà En cours, Terminé ou
// Annulé : il ne fait que refermer ce que le temps a rendu caduc, et il est donc
// rejouable sans effet.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const T_MENAGES = "tblVE8HEtnuTeCi8r";
const T_MONITORING = "tblDEkjIyKoKJG5Yj";
const DELAI_H = 48;
const LOT = 10; // maximum accepté par l'API Airtable sur une écriture

type Dict = Record<string, unknown>;
type Rec = { id: string; fields: Dict };
const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

async function airtable(method: string, path: string, body?: unknown): Promise<Dict> {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path} : HTTP ${r.status}`);
  return r.json();
}

async function lireTable(tableId: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AT_TOKEN}` }, cache: "no-store",
    });
    if (!r.ok) throw new Error(`lecture ${tableId} : HTTP ${r.status}`);
    const j = (await r.json()) as { records?: Rec[]; offset?: string };
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

async function monitoring(statut: string, detail: string) {
  const nom = "Clôture automatique des ménages";
  try {
    const d = await airtable("GET", `${T_MONITORING}?pageSize=100`);
    const row = ((d.records as Dict[]) ?? []).find(
      (r) => texte((r.fields as Dict)?.["Contrôle"]) === nom,
    );
    const fields = {
      "Contrôle": nom, Statut: statut, "Détail": detail,
      "Dernière vérification": new Date().toISOString(),
    };
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
  } catch { /* le tableau de bord ne conditionne pas la clôture */ }
}

const jourParis = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const debut = Date.now();
  try {
    const menages = await lireTable(T_MENAGES);
    const limite = Date.now() - DELAI_H * 3600_000;

    const aFermer = menages.filter((m) => {
      if (texte(m.fields["Statut"]) !== "Planifié") return false;
      const t = Date.parse(texte(m.fields["Date prévue"]));
      return Number.isFinite(t) && t < limite;
    });

    if (!aFermer.length) {
      await monitoring("OK", `Aucun ménage à clôturer (${menages.length} en base).`);
      return NextResponse.json({ ok: true, examines: menages.length, clotures: 0, duree_ms: Date.now() - debut });
    }

    const note = `Clôturé automatiquement le ${jourParis(new Date())} : plus de ${DELAI_H} h après la date prévue sans confirmation manuelle.`;
    let clotures = 0;
    const parType: Record<string, number> = {};

    for (let i = 0; i < aFermer.length; i += LOT) {
      const records = aFermer.slice(i, i + LOT).map((m) => {
        const ancien = texte(m.fields["Notes / Dégâts"]);
        return {
          id: m.id,
          fields: {
            Statut: "Terminé",
            "Notes / Dégâts": ancien ? `${ancien}\n${note}` : note,
          },
        };
      });
      await airtable("PATCH", T_MENAGES, { records, typecast: true });
      clotures += records.length;
      for (const m of aFermer.slice(i, i + LOT)) {
        const t = texte(m.fields["Type"]) || "sans type";
        parType[t] = (parType[t] || 0) + 1;
      }
    }

    const detail = `${clotures} ménage(s) clôturé(s) automatiquement (` +
      Object.entries(parType).map(([t, n]) => `${n} ${t}`).join(", ") +
      `), sans confirmation manuelle.`;
    await monitoring("OK", detail);
    return NextResponse.json({ ok: true, examines: menages.length, clotures, par_type: parType, duree_ms: Date.now() - debut });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Clôture des ménages en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
