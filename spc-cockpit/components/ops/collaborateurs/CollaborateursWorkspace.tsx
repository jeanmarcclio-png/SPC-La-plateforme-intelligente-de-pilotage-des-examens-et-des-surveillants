"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Send, UserMinus, Copy, Check, MailCheck, MailWarning, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ops/Button";
import { showToast } from "@/components/Toast";
import {
  inviterCollaborateur,
  renvoyerAcces,
  changerRoleCollaborateur,
  retirerCollaborateur,
  type Collaborateur,
  type ResultatLien,
} from "@/app/actions/collaborateurs";
import { ROLE_INFO, ROLES_COLLABORATEUR } from "@/lib/auth/collaborateurs";
import type { Role } from "@/lib/auth/roles";

const ROLE_BADGE: Record<Role, string> = {
  administrateur: "bg-indigo-50 text-indigo-700 border-indigo-200",
  coordinateur: "bg-sky-50 text-sky-700 border-sky-200",
  planificateur: "bg-teal-50 text-teal-700 border-teal-200",
  lecteur: "bg-slate-100 text-slate-600 border-slate-200",
};

const champ =
  "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400";

function dateHeure(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function StatutBadge({ statut }: { statut: Collaborateur["statut"] }) {
  return statut === "actif" ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      Actif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      Invitation en attente
    </span>
  );
}

// ---------------------------------------------------------------------------
// Résultat d'un lien d'accès (invitation ou renvoi)
// ---------------------------------------------------------------------------

function LienAcces({ resultat }: { resultat: ResultatLien }) {
  const [copie, setCopie] = useState(false);
  if (!resultat.lien) return null;

  async function copier() {
    try {
      await navigator.clipboard.writeText(resultat.lien!);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      showToast("Copie impossible : sélectionnez le lien manuellement.", "error");
    }
  }

  return (
    <div className="space-y-3">
      {resultat.emailEnvoye ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3 text-[12.5px] text-emerald-800">
          <MailCheck className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
          <span>
            Email envoyé à <strong>{resultat.email}</strong>. Le lien ci-dessous est le même, si vous préférez le
            transmettre vous-même.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-[12.5px] text-amber-900">
          <MailWarning className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
          <span>
            {resultat.emailErreur
              ? `L'email n'a pas pu partir (${resultat.emailErreur}).`
              : "L'envoi automatique d'email n'est pas configuré."}{" "}
            Transmettez ce lien à <strong>{resultat.email}</strong> (email, SMS, messagerie).
          </span>
        </div>
      )}

      <div>
        <label htmlFor="lien-acces" className="block text-[11.5px] font-semibold text-gray-500 mb-1">
          Lien d&apos;accès personnel
        </label>
        <div className="flex gap-2">
          <input
            id="lien-acces"
            readOnly
            value={resultat.lien}
            onFocus={(e) => e.currentTarget.select()}
            className={`${champ} font-mono text-[11.5px] text-gray-600`}
          />
          <Button type="button" variant="secondary" size="sm" onClick={copier} aria-label="Copier le lien">
            {copie ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
            {copie ? "Copié" : "Copier"}
          </Button>
        </div>
        <p className="text-[11.5px] text-gray-400 mt-1.5">
          À usage unique et à durée limitée. Il permet au collaborateur de choisir son mot de passe. Si le lien
          expire, utilisez « Renvoyer l&apos;accès ».
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invitation
// ---------------------------------------------------------------------------

function InviterDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<Role>("lecteur");
  const [error, setError] = useState("");
  const [resultat, setResultat] = useState<ResultatLien | null>(null);

  function reinitialiser() {
    setEmail("");
    setNom("");
    setRole("lecteur");
    setError("");
    setResultat(null);
  }

  function fermer(v: boolean) {
    onOpenChange(v);
    if (!v) reinitialiser();
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await inviterCollaborateur({ email, role, nom });
      if (!res.ok) {
        setError(res.error ?? "Invitation impossible.");
        return;
      }
      if (res.error) showToast(res.error, "error");
      setResultat(res);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={fermer}>
      <DialogContent className="max-w-[520px] w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resultat ? "Accès créé" : "Inviter un collaborateur"}</DialogTitle>
        </DialogHeader>

        {resultat ? (
          <div className="space-y-4">
            <LienAcces resultat={resultat} />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={reinitialiser}>
                Inviter quelqu&apos;un d&apos;autre
              </Button>
              <Button type="button" onClick={() => fermer(false)}>
                Terminer
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={soumettre} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="inv-email" className="block text-[11.5px] font-semibold text-gray-500 mb-1">
                  Email professionnel <span className="text-rose-500">*</span>
                </label>
                <input
                  id="inv-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@exemple.fr"
                  className={champ}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="inv-nom" className="block text-[11.5px] font-semibold text-gray-500 mb-1">
                  Nom affiché <span className="text-gray-400 font-normal">(facultatif)</span>
                </label>
                <input
                  id="inv-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Prénom Nom"
                  className={champ}
                />
              </div>
            </div>

            <fieldset>
              <legend className="block text-[11.5px] font-semibold text-gray-500 mb-1.5">Rôle</legend>
              <div className="space-y-2">
                {ROLES_COLLABORATEUR.map((r) => (
                  <label
                    key={r}
                    className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer transition-colors ${
                      role === r ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                      className="mt-1 accent-indigo-600"
                    />
                    <span>
                      <span className="block text-[13px] font-semibold text-gray-800">{ROLE_INFO[r].libelle}</span>
                      <span className="block text-[12px] text-gray-500">{ROLE_INFO[r].description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-100 text-red-600 text-[12.5px] rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => fermer(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="accent" disabled={pending || !email.trim()}>
                <UserPlus className="w-4 h-4" aria-hidden />
                {pending ? "Création…" : "Créer l'accès"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Ligne collaborateur
// ---------------------------------------------------------------------------

function LigneCollaborateur({ c, onLien }: { c: Collaborateur; onLien: (r: ResultatLien) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmer, setConfirmer] = useState(false);
  const libelle = c.nom ?? c.email;

  function changerRole(role: string) {
    startTransition(async () => {
      const res = await changerRoleCollaborateur(c.userId, role);
      if (res.error) showToast(res.error, "error");
      else {
        showToast(`${libelle} est désormais ${ROLE_INFO[role as Role].libelle.toLowerCase()}.`);
        router.refresh();
      }
    });
  }

  function renvoyer() {
    startTransition(async () => {
      const res = await renvoyerAcces(c.userId);
      if (res.error) showToast(res.error, "error");
      else onLien(res);
    });
  }

  function retirer() {
    startTransition(async () => {
      const res = await retirerCollaborateur(c.userId);
      setConfirmer(false);
      if (res.error) showToast(res.error, "error");
      else {
        showToast(`Accès de ${libelle} retiré.`);
        router.refresh();
      }
    });
  }

  return (
    <li className="px-4 md:px-5 py-3.5 grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto] gap-2.5 md:gap-4 md:items-center">
      {/* Identité */}
      <div className="min-w-0 flex items-center gap-3">
        <span
          aria-hidden
          className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a6b7e] to-[#7c5cff] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0"
        >
          {libelle.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-gray-900 truncate flex items-center gap-2">
            {libelle}
            {c.estMoi && (
              <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Vous</span>
            )}
          </div>
          {c.nom && <div className="text-[12px] text-gray-400 truncate">{c.email}</div>}
        </div>
      </div>

      {/* Rôle */}
      <div>
        {c.estMoi ? (
          <span className={`inline-flex text-[11.5px] font-semibold px-2.5 py-1 rounded-full border ${ROLE_BADGE[c.role]}`}>
            {ROLE_INFO[c.role].libelle}
          </span>
        ) : (
          <select
            aria-label={`Rôle de ${libelle}`}
            value={c.role}
            disabled={pending}
            onChange={(e) => changerRole(e.target.value)}
            className="w-full md:w-auto px-2.5 py-1.5 rounded-lg border border-gray-200 text-[12.5px] font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-50"
          >
            {ROLES_COLLABORATEUR.map((r) => (
              <option key={r} value={r}>
                {ROLE_INFO[r].libelle}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Statut */}
      <div>
        <StatutBadge statut={c.statut} />
      </div>

      {/* Dernière connexion */}
      <div className="text-[12px] text-gray-500">
        <span className="md:hidden text-gray-400">Dernière connexion : </span>
        {c.derniereConnexion ? dateHeure(c.derniereConnexion) : "Jamais"}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 md:justify-end">
        {!c.estMoi && (
          <>
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={renvoyer} title="Générer un nouveau lien d'accès">
              <Send className="w-3.5 h-3.5" aria-hidden />
              Renvoyer l&apos;accès
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmer(true)}
              aria-label={`Retirer l'accès de ${libelle}`}
              title="Retirer l'accès"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <UserMinus className="w-4 h-4" aria-hidden />
            </Button>
          </>
        )}
      </div>

      <Dialog open={confirmer} onOpenChange={setConfirmer}>
        <DialogContent className="max-w-[440px] w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Retirer l&apos;accès ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-gray-600 mb-5">
            <strong>{libelle}</strong> ne pourra plus consulter ni modifier les données de l&apos;organisation. Vous
            pourrez l&apos;inviter de nouveau plus tard.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmer(false)}>
              Annuler
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={retirer}>
              {pending ? "Retrait…" : "Retirer l'accès"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Espace de travail
// ---------------------------------------------------------------------------

export function InviterBouton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="accent" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4" aria-hidden />
        Inviter un collaborateur
      </Button>
      <InviterDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function CollaborateursWorkspace({ collaborateurs }: { collaborateurs: Collaborateur[] }) {
  const [lien, setLien] = useState<ResultatLien | null>(null);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto] gap-4 px-5 py-2.5 border-b border-gray-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
          <span>Collaborateur</span>
          <span>Rôle</span>
          <span>Statut</span>
          <span>Dernière connexion</span>
          <span className="w-[170px] text-right">Actions</span>
        </div>
        {collaborateurs.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-gray-400">
            Aucun collaborateur pour l&apos;instant. Invitez votre premier collaborateur.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {collaborateurs.map((c) => (
              <LigneCollaborateur key={c.userId} c={c} onLien={setLien} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2.5 text-[12px] text-gray-500 px-1">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden />
        <p>
          Les comptes des surveillants (portail « Mon planning ») se gèrent depuis l&apos;écran{" "}
          <a href="/operations/surveillants" className="text-indigo-600 hover:underline">
            Surveillants
          </a>
          . Retirer un accès ne supprime aucune donnée.
        </p>
      </div>

      <Dialog open={!!lien} onOpenChange={(v) => !v && setLien(null)}>
        <DialogContent className="max-w-[520px] w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Nouveau lien d&apos;accès</DialogTitle>
          </DialogHeader>
          {lien && <LienAcces resultat={lien} />}
          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => setLien(null)}>
              Terminer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
