import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — SPC",
  description: "Comment SPC traite les données personnelles de la plateforme de pilotage des examens.",
};

// Page publique (accessible sans authentification — voir proxy.ts).
export default function ConfidentialitePage() {
  return (
    <div className="min-h-dvh bg-[#f0f2f5] py-10 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-6 md:p-10 text-[14px] leading-relaxed text-gray-700">
        <header className="mb-6">
          <div className="text-[12px] font-bold uppercase tracking-[1.5px] text-[#4a90d9]">SAS Service Pédagogie Conseil (SPC)</div>
          <h1 className="text-2xl font-extrabold text-[#0d1e2e] mt-1">Politique de confidentialité</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Plateforme SPC — pilotage des examens et des surveillants
          </p>
          <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            PROJET — Version 0.1 — Juillet 2026 — À faire valider par un conseil juridique avant diffusion.
          </p>
        </header>

        <p>
          Dernière mise à jour : [date de publication]. La présente politique décrit comment la SAS
          Service Pédagogie Conseil (« SPC », « nous ») traite les données personnelles dans le cadre
          de la plateforme SPC et de ses services de surveillance d’examens.
        </p>

        <Section n="1" titre="Qui est responsable de vos données ?">
          <p>Cela dépend de votre situation :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><b>Surveillant(e) ou candidat(e) chez SPC</b> : SPC est responsable de traitement.</li>
            <li><b>Personnel d’un établissement client</b> (coordinateur, scolarité) : votre établissement est responsable de traitement ; SPC agit comme sous-traitant conformément à l’accord conclu avec lui.</li>
          </ul>
          <p className="mt-2">Contact : SAS Service Pédagogie Conseil — [adresse] — [email de contact RGPD].</p>
        </Section>

        <Section n="2" titre="Quelles données traitons-nous, et pourquoi ?">
          <Table
            head={["Finalité", "Données", "Base légale"]}
            rows={[
              ["Gestion du vivier et affectation aux sessions", "Identité, téléphone, email, disponibilités, historique d’affectations", "Contrat de travail ; intérêt légitime (candidats)"],
              ["Convocations et notifications (SMS, email)", "Téléphone, contenu des convocations, horodatage des réponses", "Contrat de travail"],
              ["Décompte des heures et préparation de la paie", "Heures, taux horaire, brut/net estimés", "Obligation légale ; contrat"],
              ["Comptes utilisateurs et sécurité", "Email, journaux de connexion, actions horodatées", "Contrat ; intérêt légitime (sécurité)"],
              ["Assistance et amélioration du service", "Échanges de support, données d’usage agrégées", "Intérêt légitime"],
            ]}
          />
          <p className="mt-3">
            La plateforme ne traite aucune donnée bancaire et n’a pas vocation à recevoir de données de
            santé. Les aménagements d’épreuves (ex. tiers-temps) sont enregistrés au niveau des sessions
            d’examen, <b>sans identification des étudiants concernés</b>.
          </p>
        </Section>

        <Section n="3" titre="Qui accède à vos données ?">
          <ul className="list-disc pl-5 space-y-1">
            <li>Les équipes SPC habilitées (coordination, administration), chacune selon son rôle.</li>
            <li>L’établissement dans lequel vous êtes affecté(e), pour le planning nominatif de ses propres sessions uniquement.</li>
            <li>Nos sous-traitants techniques : hébergement (Supabase, Vercel — données hébergées dans l’Union européenne), envoi de SMS ([prestataire]), paie ([prestataire]). Chacun est lié par un contrat conforme à l’article 28 du RGPD.</li>
          </ul>
          <p className="mt-2">Nous ne vendons ni ne louons aucune donnée personnelle.</p>
        </Section>

        <Section n="4" titre="Transferts hors Union européenne">
          <p>
            Les données sont hébergées dans l’Union européenne. Si un sous-traitant venait à traiter des
            données hors UE (ex. support technique), ce transfert serait encadré par les mécanismes prévus
            au chapitre V du RGPD (décision d’adéquation, clauses contractuelles types). Le registre des
            sous-traitants est disponible sur demande.
          </p>
        </Section>

        <Section n="5" titre="Combien de temps conservons-nous vos données ?">
          <Table
            head={["Données", "Durée"]}
            rows={[
              ["Dossier surveillant actif", "Durée de la relation contractuelle"],
              ["Éléments de calcul de paie", "5 ans"],
              ["Candidatures sans suite", "2 ans"],
              ["Journaux de connexion et d’envoi SMS", "12 mois"],
              ["Comptes inactifs", "Suppression ou anonymisation 2 ans après la fin de la relation"],
              ["Données de sessions d’examens", "Purge à N+2"],
            ]}
          />
        </Section>

        <Section n="6" titre="Comment vos données sont-elles protégées ?">
          <ul className="list-disc pl-5 space-y-1">
            <li>Hébergement dans l’Union européenne, chiffrement en transit et au repos.</li>
            <li>Cloisonnement strict par établissement et par rôle : un surveillant n’accède qu’à ses propres plannings et disponibilités.</li>
            <li>Authentification par lien sécurisé à durée limitée ou mot de passe.</li>
            <li>Journalisation des actions sensibles (affectations, annulations, remplacements).</li>
          </ul>
        </Section>

        <Section n="7" titre="Vos droits">
          <p>
            Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et
            de portabilité, ainsi que du droit de définir des directives post-mortem. Pour les exercer :
            [email de contact RGPD]. Nous répondons dans un délai d’un mois. Si vous relevez d’un
            établissement client, nous transmettons votre demande à cet établissement, seul compétent pour y
            répondre.
          </p>
          <p className="mt-2">Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>
        </Section>

        <Section n="8" titre="Cookies et traceurs">
          <p>
            La plateforme utilise uniquement des cookies strictement nécessaires (session, authentification,
            sécurité), exemptés de consentement. Aucun cookie publicitaire ou de mesure d’audience tierce
            n’est déposé.
          </p>
        </Section>

        <Section n="9" titre="Évolution de la présente politique">
          <p>
            Toute évolution substantielle sera notifiée via la plateforme et, pour les surveillants, par les
            canaux habituels de convocation. La version en vigueur est datée en tête de document.
          </p>
        </Section>

        <footer className="mt-8 pt-4 border-t border-gray-100 text-[12px] text-gray-400 flex items-center justify-between">
          <span>© SAS Service Pédagogie Conseil</span>
          <Link href="/login" className="text-[#4a90d9] hover:underline">Retour à la connexion</Link>
        </footer>
      </article>
    </div>
  );
}

function Section({ n, titre, children }: { n: string; titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-[15px] font-bold text-[#0d1e2e] mb-2">{n}. {titre}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-2 rounded-lg border border-gray-200">
      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left">
            {head.map((h) => <th key={h} className="px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => <td key={j} className="px-3 py-2 border-b border-gray-100 text-gray-600">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
