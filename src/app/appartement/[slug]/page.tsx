import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentDetail from "./ApartmentDetail";
import apartmentsDataRaw from "@/data/apartments.json";
import type { ApartmentRecord } from "@/data/apartment-types";
import { resolveOgCover } from "@/lib/og-cover";

const apartmentsData = apartmentsDataRaw as ApartmentRecord[];

export async function generateStaticParams() {
  return apartmentsData.map((apt) => ({ slug: apt.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const apt = apartmentsData.find((a) => a.slug === slug);
  if (!apt) return { title: "Appartement non trouvé" };
  const title = `Location meublée ${apt.district} — ${apt.title}, ${apt.surface}m² | Move in Paris`;
  const description = `Location meublée à Paris ${apt.district} : ${apt.title}, ${apt.surface}m², ${apt.bedrooms} chambre(s). Appartement meublé haut de gamme pour location corporate et expatriés. ${apt.description.slice(0, 110)}...`;
  // Cover convention: images[0] is the card thumbnail in the listing AND the OG image shared on WhatsApp/Facebook/Twitter.
  const coverPath = apt.images && apt.images.length > 0 ? apt.images[0] : "/Logo-gold.png";
  const cover = resolveOgCover(coverPath, apt.title);
  const canonical = `https://www.move-in-paris.com/appartement/${apt.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "Move in Paris",
      locale: "fr_FR",
      url: canonical,
      title,
      description,
      images: [cover],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cover.url],
    },
  };
}

export default async function ApartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const apt = apartmentsData.find((a) => a.slug === slug);

  if (!apt) {
    return (
      <>
        <Header />
        <main className="pt-32 pb-20 text-center">
          <h1 className="font-serif text-3xl text-noir">Appartement non trouvé</h1>
        </main>
        <Footer />
      </>
    );
  }

  const url = `https://www.move-in-paris.com/appartement/${apt.slug}`;
  const absoluteImages = apt.images?.map((img) =>
    img.startsWith("http") ? img : `https://www.move-in-paris.com${img}`,
  );
  const apartmentLd = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: `Location meublée ${apt.district} — ${apt.title}`,
    description: apt.description,
    url,
    image: absoluteImages,
    floorSize: { "@type": "QuantitativeValue", value: apt.surface, unitCode: "MTK" },
    numberOfRooms: apt.rooms,
    numberOfBedrooms: apt.bedrooms,
    numberOfBathroomsTotal: apt.bathrooms,
    address: {
      "@type": "PostalAddress",
      streetAddress: apt.address,
      addressLocality: "Paris",
      addressRegion: apt.district,
      addressCountry: "FR",
    },
    accommodationCategory: "Furnished apartment",
    petsAllowed: false,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.move-in-paris.com" },
      { "@type": "ListItem", position: 2, name: "Nos appartements", item: "https://www.move-in-paris.com/nos-appartements" },
      { "@type": "ListItem", position: 3, name: apt.title, item: url },
    ],
  };

  return (
    <>
      <Header />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(apartmentLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        <ApartmentDetail apartment={apt} />
      </main>
      <Footer />
    </>
  );
}
