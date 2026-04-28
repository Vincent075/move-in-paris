import type { Metadata } from "next";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import LatestApartments from "@/components/LatestApartments";
import Services from "@/components/Services";
import CorporateCallout from "@/components/CorporateCallout";
import WhyUs from "@/components/WhyUs";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.move-in-paris.com" },
};

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SearchBar />
        <LatestApartments />
        <Services />
        <CorporateCallout />
        <WhyUs />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
