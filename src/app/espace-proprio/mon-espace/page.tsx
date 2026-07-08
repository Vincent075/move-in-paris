import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import DemoDashboard from "@/components/espace-proprio/DemoDashboard";
import { readSession } from "@/lib/espace-proprio/auth";
import { resolveOwnerByEmail, getPortalData, dataSourceLabel } from "@/lib/espace-proprio/provider";

export const metadata: Metadata = {
  title: "Mon espace · Espace Propriétaire · Move in Paris",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function frDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate() === 1 ? "1ᵉʳ" : String(d.getDate());
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()} à ${h} h ${m}`;
}

export default async function MonEspace() {
  const session = await readSession().catch(() => null);
  if (!session) redirect("/espace-proprio");

  const owner = await resolveOwnerByEmail(session.email);
  if (!owner) redirect("/api/espace-proprio/logout");

  const data = await getPortalData(owner);

  const banner =
    dataSourceLabel() === "mock"
      ? "Espace de test · données fictives en attendant la mise en service"
      : null;

  return (
    <>
      <DemoDashboard
        data={{ ...data, ownerName: owner.greetingName }}
        bannerLabel={banner}
        chipName={owner.chipName}
        lastLoginLabel={session.prevLogin ? frDateTime(session.prevLogin) : null}
        logoutHref="/api/espace-proprio/logout"
      />
      <Footer />
    </>
  );
}
