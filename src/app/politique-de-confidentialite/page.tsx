import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Politique de Confidentialité RGPD | Move in Paris",
  description:
    "Politique de confidentialité de Move in Paris conforme au RGPD. Découvrez comment nous collectons, utilisons et protégeons vos données personnelles.",
  keywords: "politique confidentialité RGPD move in paris, données personnelles, protection données, droits utilisateurs",
  openGraph: {
    title: "Politique de Confidentialité — Move in Paris",
    description: "Traitement de vos données personnelles par Move in Paris, conforme au RGPD.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PolitiqueDeConfidentialite() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          title="Politique de confidentialité"
          subtitle="Move in Paris s'engage à protéger vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD)."
          breadcrumb="Politique de confidentialité"
        />

        <section className="bg-blanc py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">

            {/* Préambule */}
            <div className="mb-14">
              <p className="text-gris font-light leading-relaxed mb-4">
                La présente politique de confidentialité a pour objet d&apos;informer les utilisateurs du site www.move-in-paris.com sur la manière dont leurs données personnelles sont collectées, traitées et protégées par la société Move in Paris.
              </p>
              <p className="text-gris font-light leading-relaxed">
                Elle est établie conformément au Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 relative à l&apos;informatique, aux fichiers et aux libertés, modifiée par la loi n° 2018-493 du 20 juin 2018.
              </p>
            </div>

            {/* 1. Responsable de traitement */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                1. Responsable du traitement
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Le responsable du traitement de vos données personnelles est :
              </p>
              <div className="bg-blanc-chaud border border-gris-clair p-6 space-y-2">
                <p className="text-gris font-light"><span className="text-noir font-normal">Société :</span> Move in Paris</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Adresse :</span> 26, rue de l&apos;Étoile, 75017 Paris</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Téléphone :</span> +33 1 45 20 06 03</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Email :</span> contact@move-in-paris.com</p>
              </div>
            </div>

            {/* 2. Données collectées */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                2. Données personnelles collectées
              </h2>
              <p className="text-gris font-light leading-relaxed mb-6">
                Move in Paris collecte uniquement les données personnelles strictement nécessaires à l&apos;accomplissement de ses services. Les données collectées varient selon les formulaires utilisés sur le site :
              </p>

              <h3 className="font-serif text-xl text-noir mb-3">2.1 Formulaire de contact général</h3>
              <p className="text-gris font-light leading-relaxed mb-2">Les données suivantes peuvent être collectées :</p>
              <ul className="list-disc list-outside ml-6 text-gris font-light leading-relaxed space-y-1 mb-6">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Message et motif du contact</li>
              </ul>

              <h3 className="font-serif text-xl text-noir mb-3">2.2 Formulaire de demande de logement</h3>
              <p className="text-gris font-light leading-relaxed mb-2">Les données suivantes peuvent être collectées :</p>
              <ul className="list-disc list-outside ml-6 text-gris font-light leading-relaxed space-y-1 mb-6">
                <li>Nom et prénom</li>
                <li>Adresse email professionnelle</li>
                <li>Numéro de téléphone</li>
                <li>Nom de l&apos;entreprise</li>
                <li>Budget, durée de séjour souhaitée et quartier(s) recherché(s)</li>
                <li>Date d&apos;entrée souhaitée</li>
                <li>Nombre d&apos;occupants</li>
              </ul>

              <h3 className="font-serif text-xl text-noir mb-3">2.3 Formulaire propriétaire (proposition de bien)</h3>
              <p className="text-gris font-light leading-relaxed mb-2">Les données suivantes peuvent être collectées :</p>
              <ul className="list-disc list-outside ml-6 text-gris font-light leading-relaxed space-y-1 mb-6">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Adresse du bien immobilier</li>
                <li>Informations sur le bien (surface, nombre de pièces, équipements)</li>
              </ul>

              <h3 className="font-serif text-xl text-noir mb-3">2.4 Données de navigation</h3>
              <p className="text-gris font-light leading-relaxed">
                Des données techniques sont automatiquement collectées lors de votre navigation sur le site : adresse IP, type et version du navigateur, système d&apos;exploitation, pages visitées, durée de visite, date et heure de connexion. Ces données sont utilisées à des fins statistiques et pour améliorer la performance du site.
              </p>
            </div>

            {/* 3. Finalités et base légale */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                3. Finalités du traitement et base légale
              </h2>
              <p className="text-gris font-light leading-relaxed mb-6">
                Move in Paris traite vos données personnelles pour les finalités suivantes :
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-noir-deep">
                      <th className="text-left p-4 text-blanc font-normal text-xs tracking-wider uppercase">Finalité</th>
                      <th className="text-left p-4 text-blanc font-normal text-xs tracking-wider uppercase">Base légale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gris-clair">
                    <tr className="bg-blanc-chaud">
                      <td className="p-4 text-gris font-light">Répondre à vos demandes de contact et de renseignements</td>
                      <td className="p-4 text-gris font-light">Intérêt légitime (art. 6.1.f RGPD)</td>
                    </tr>
                    <tr className="bg-blanc">
                      <td className="p-4 text-gris font-light">Proposer des biens correspondant à vos critères de recherche</td>
                      <td className="p-4 text-gris font-light">Exécution de mesures précontractuelles (art. 6.1.b RGPD)</td>
                    </tr>
                    <tr className="bg-blanc-chaud">
                      <td className="p-4 text-gris font-light">Gérer la relation commerciale et les contrats de location</td>
                      <td className="p-4 text-gris font-light">Exécution du contrat (art. 6.1.b RGPD)</td>
                    </tr>
                    <tr className="bg-blanc">
                      <td className="p-4 text-gris font-light">Respecter nos obligations légales et réglementaires</td>
                      <td className="p-4 text-gris font-light">Obligation légale (art. 6.1.c RGPD)</td>
                    </tr>
                    <tr className="bg-blanc-chaud">
                      <td className="p-4 text-gris font-light">Améliorer nos services et analyser la fréquentation du site</td>
                      <td className="p-4 text-gris font-light">Intérêt légitime (art. 6.1.f RGPD)</td>
                    </tr>
                    <tr className="bg-blanc">
                      <td className="p-4 text-gris font-light">Envoi de communications commerciales (avec consentement)</td>
                      <td className="p-4 text-gris font-light">Consentement (art. 6.1.a RGPD)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Durée de conservation */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                4. Durée de conservation des données
              </h2>
              <p className="text-gris font-light leading-relaxed mb-6">
                Move in Paris conserve vos données personnelles pour la durée strictement nécessaire aux finalités pour lesquelles elles ont été collectées :
              </p>
              <ul className="list-disc list-outside ml-6 text-gris font-light leading-relaxed space-y-3">
                <li>
                  <span className="text-noir font-normal">Demandes de contact et de renseignements :</span> les données sont conservées pendant 3 ans à compter du dernier contact, sauf relation commerciale établie.
                </li>
                <li>
                  <span className="text-noir font-normal">Données relatives à un contrat de location :</span> les données sont conservées pendant la durée du contrat, puis pendant 5 ans à compter de la fin du contrat conformément aux obligations légales applicables (obligations comptables et fiscales).
                </li>
                <li>
                  <span className="text-noir font-normal">Données de navigation (logs) :</span> les données de connexion sont conservées pendant 12 mois conformément aux obligations légales.
                </li>
                <li>
                  <span className="text-noir font-normal">Données collectées sur la base du consentement :</span> les données sont conservées jusqu&apos;au retrait du consentement ou pendant 3 ans à compter du dernier contact actif.
                </li>
              </ul>
            </div>

            {/* 5. Destinataires des données */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                5. Destinataires et sous-traitants
              </h2>
              <p className="text-gris font-light leading-relaxed mb-6">
                Vos données personnelles sont destinées aux collaborateurs habilités de Move in Paris dans le cadre strict de leurs missions. Move in Paris peut également faire appel à des prestataires techniques qui agissent en qualité de sous-traitants :
              </p>

              <div className="space-y-4">
                <div className="bg-blanc-chaud border border-gris-clair p-5">
                  <h4 className="text-noir font-normal mb-2">Vercel Inc. — Hébergement du site</h4>
                  <p className="text-gris font-light text-sm leading-relaxed">
                    Le site est hébergé par Vercel Inc. (San Francisco, États-Unis). Vercel est certifié conforme aux exigences de transferts internationaux de données selon les mécanismes approuvés par la Commission européenne (clauses contractuelles types). Pour en savoir plus : <span className="text-gold">vercel.com/legal/privacy-policy</span>
                  </p>
                </div>

                <div className="bg-blanc-chaud border border-gris-clair p-5">
                  <h4 className="text-noir font-normal mb-2">Resend — Envoi d&apos;emails transactionnels</h4>
                  <p className="text-gris font-light text-sm leading-relaxed">
                    Les emails de confirmation envoyés suite à vos soumissions de formulaires sont acheminés via Resend (Workos Inc., San Francisco). Vos données (nom, adresse email) sont transmises à ce prestataire dans le seul but d&apos;acheminer ces communications. Pour en savoir plus : <span className="text-gold">resend.com/legal/privacy-policy</span>
                  </p>
                </div>

                <div className="bg-blanc-chaud border border-gris-clair p-5">
                  <h4 className="text-noir font-normal mb-2">Google Maps — Cartographie</h4>
                  <p className="text-gris font-light text-sm leading-relaxed">
                    Le site utilise Google Maps (Google LLC, Mountain View, États-Unis) pour afficher la localisation de nos appartements et de notre agence. Google Maps peut collecter des données de navigation conformément à la politique de confidentialité de Google. Pour en savoir plus : <span className="text-gold">policies.google.com/privacy</span>
                  </p>
                </div>
              </div>

              <p className="text-gris font-light leading-relaxed mt-6">
                Move in Paris s&apos;assure que ces sous-traitants présentent des garanties suffisantes quant à la mise en œuvre de mesures techniques et organisationnelles appropriées et que les transferts de données hors de l&apos;Union européenne sont encadrés par les mécanismes juridiques adéquats.
              </p>
              <p className="text-gris font-light leading-relaxed mt-4">
                Move in Paris ne vend, ne loue ni ne cède vos données personnelles à des tiers à des fins commerciales.
              </p>
            </div>

            {/* 6. Vos droits */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                6. Vos droits
              </h2>
              <p className="text-gris font-light leading-relaxed mb-6">
                Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants concernant vos données personnelles :
              </p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1 bg-gold flex-shrink-0 mt-1"></div>
                  <div>
                    <h4 className="text-noir font-normal mb-1">Droit d&apos;accès (art. 15 RGPD)</h4>
                    <p className="text-gris font-light text-sm leading-relaxed">Vous pouvez obtenir la confirmation que des données vous concernant sont traitées et en obtenir une copie.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-gold flex-shrink-0 mt-1"></div>
                  <div>
                    <h4 className="text-noir font-normal mb-1">Droit de rectification (art. 16 RGPD)</h4>
                    <p className="text-gris font-light text-sm leading-relaxed">Vous pouvez demander la correction de données inexactes ou incomplètes vous concernant.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-gold flex-shrink-0 mt-1"></div>
                  <div>
                    <h4 className="text-noir font-normal mb-1">Droit à l&apos;effacement (art. 17 RGPD)</h4>
                    <p className="text-gris font-light text-sm leading-relaxed">Vous pouvez demander la suppression de vos données, sous réserve de nos obligations légales de conservation.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-gold flex-shrink-0 mt-1"></div>
                  <div>
                    <h4 className="text-noir font-normal mb-1">Droit à la limitation du traitement (art. 18 RGPD)</h4>
                    <p className="text-gris font-light text-sm leading-relaxed">Vous pouvez demander la suspension du traitement de vos données dans certains cas prévus par le RGPD.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-gold flex-shrink-0 mt-1"></div>
                  <div>
                    <h4 className="text-noir font-normal mb-1">Droit à la portabilité (art. 20 RGPD)</h4>
                    <p className="text-gris font-light text-sm leading-relaxed">Vous pouvez recevoir vos données dans un format structuré, couramment utilisé et lisible par machine, pour les traitements basés sur votre consentement ou un contrat.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-gold flex-shrink-0 mt-1"></div>
                  <div>
                    <h4 className="text-noir font-normal mb-1">Droit d&apos;opposition (art. 21 RGPD)</h4>
                    <p className="text-gris font-light text-sm leading-relaxed">Vous pouvez vous opposer au traitement de vos données pour des raisons tenant à votre situation particulière, notamment pour les traitements fondés sur l&apos;intérêt légitime. Vous disposez d&apos;un droit d&apos;opposition absolu au traitement à des fins de prospection commerciale.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-gold flex-shrink-0 mt-1"></div>
                  <div>
                    <h4 className="text-noir font-normal mb-1">Droit de retrait du consentement</h4>
                    <p className="text-gris font-light text-sm leading-relaxed">Lorsque le traitement est fondé sur votre consentement, vous pouvez le retirer à tout moment, sans que cela ne remette en cause la licéité du traitement effectué avant ce retrait.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-blanc-chaud border border-gris-clair p-6">
                <h4 className="text-noir font-normal mb-3">Comment exercer vos droits ?</h4>
                <p className="text-gris font-light text-sm leading-relaxed mb-3">
                  Pour exercer vos droits, vous pouvez nous contacter par email à{" "}
                  <a href="mailto:contact@move-in-paris.com" className="text-gold hover:underline">contact@move-in-paris.com</a>
                  {" "}ou par courrier à l&apos;adresse : Move in Paris, 26, rue de l&apos;Étoile, 75017 Paris.
                </p>
                <p className="text-gris font-light text-sm leading-relaxed">
                  Nous nous engageons à répondre à votre demande dans un délai d&apos;un mois à compter de la réception de celle-ci. Ce délai peut être prolongé de deux mois compte tenu de la complexité et du nombre de demandes. Vous pouvez être amené à justifier de votre identité.
                </p>
              </div>

              <p className="text-gris font-light leading-relaxed mt-6">
                Si vous estimez que le traitement de vos données personnelles n&apos;est pas conforme à la réglementation applicable, vous disposez du droit d&apos;introduire une réclamation auprès de la Commission Nationale de l&apos;Informatique et des Libertés (CNIL), 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — <span className="text-gold">www.cnil.fr</span>.
              </p>
            </div>

            {/* 7. Cookies */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                7. Cookies et technologies de suivi
              </h2>

              <h3 className="font-serif text-xl text-noir mb-3">7.1 Qu&apos;est-ce qu&apos;un cookie ?</h3>
              <p className="text-gris font-light leading-relaxed mb-6">
                Un cookie est un petit fichier texte placé sur votre terminal (ordinateur, tablette, téléphone) lors de la visite d&apos;un site internet. Les cookies permettent au site de mémoriser des informations sur votre visite et d&apos;améliorer votre expérience.
              </p>

              <h3 className="font-serif text-xl text-noir mb-3">7.2 Types de cookies utilisés</h3>
              <div className="space-y-4 mb-6">
                <div className="bg-blanc-chaud border border-gris-clair p-5">
                  <h4 className="text-noir font-normal mb-2">Cookies strictement nécessaires</h4>
                  <p className="text-gris font-light text-sm leading-relaxed">Ces cookies sont indispensables au fonctionnement du site et ne peuvent pas être désactivés. Ils permettent notamment d&apos;assurer la sécurité du site et de mémoriser vos choix de navigation. Aucun consentement n&apos;est requis pour leur dépôt.</p>
                </div>
                <div className="bg-blanc-chaud border border-gris-clair p-5">
                  <h4 className="text-noir font-normal mb-2">Cookies d&apos;analyse et de performance</h4>
                  <p className="text-gris font-light text-sm leading-relaxed">Ces cookies nous permettent de mesurer l&apos;audience du site, de comprendre comment les visiteurs l&apos;utilisent et d&apos;améliorer son fonctionnement. Ces cookies sont déposés uniquement avec votre consentement préalable.</p>
                </div>
                <div className="bg-blanc-chaud border border-gris-clair p-5">
                  <h4 className="text-noir font-normal mb-2">Cookies de cartographie (Google Maps)</h4>
                  <p className="text-gris font-light text-sm leading-relaxed">L&apos;intégration de Google Maps sur notre site peut entraîner le dépôt de cookies par Google afin d&apos;assurer le fonctionnement de la carte et de recueillir des statistiques d&apos;usage. Ces cookies sont soumis à la politique de confidentialité de Google.</p>
                </div>
              </div>

              <h3 className="font-serif text-xl text-noir mb-3">7.3 Gérer vos préférences</h3>
              <p className="text-gris font-light leading-relaxed">
                Vous pouvez à tout moment paramétrer vos préférences en matière de cookies directement dans votre navigateur. La plupart des navigateurs vous permettent de refuser les cookies, de supprimer ceux déjà stockés ou d&apos;être alerté lors de leur dépôt. Veuillez noter que le refus de certains cookies peut affecter votre expérience de navigation sur notre site. Pour plus d&apos;informations sur la gestion des cookies, consultez le site de la CNIL : <span className="text-gold">www.cnil.fr/fr/cookies-les-outils-pour-les-maitriser</span>.
              </p>
            </div>

            {/* 8. Sécurité */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                8. Sécurité des données
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Move in Paris met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre toute perte, destruction, altération, accès ou divulgation non autorisés. Ces mesures incluent notamment :
              </p>
              <ul className="list-disc list-outside ml-6 text-gris font-light leading-relaxed space-y-2">
                <li>Le chiffrement des données en transit via le protocole HTTPS (TLS)</li>
                <li>La restriction de l&apos;accès aux données personnelles aux seuls collaborateurs habilités</li>
                <li>Des procédures de sauvegarde et de récupération des données</li>
                <li>Des mises à jour régulières des systèmes informatiques</li>
              </ul>
            </div>

            {/* 9. Modification */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                9. Modification de la politique de confidentialité
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Move in Paris se réserve le droit de modifier la présente politique de confidentialité à tout moment, notamment pour se conformer à toute évolution législative, réglementaire ou jurisprudentielle, ou à tout changement dans les services proposés.
              </p>
              <p className="text-gris font-light leading-relaxed">
                Nous vous invitons à consulter régulièrement cette page afin de prendre connaissance des éventuelles modifications. La date de dernière mise à jour est indiquée en bas de page.
              </p>
            </div>

            {/* Mise à jour */}
            <div className="pt-8 border-t border-gris-clair">
              <p className="text-gris font-light text-sm">
                Dernière mise à jour : avril 2026
              </p>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
