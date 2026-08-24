"use client";

// Narrateur de la démonstration — panneau commentant l'écran courant.
//
// PRINCIPE : LE TEXTE D'ABORD
// ---------------------------
// Le commentaire est TOUJOURS affiché. La lecture à voix haute est un confort
// ajouté par-dessus, jamais le seul véhicule de l'information. Un visiteur
// sourd, un visiteur sans écouteurs dans un open space, un navigateur dépourvu
// de voix française : dans les trois cas la démonstration reste intégralement
// compréhensible. C'est aussi ce qu'exige le niveau AA du référentiel
// d'accessibilité — un contenu audio doit avoir un équivalent textuel.
//
// PAS DE LECTURE AUTOMATIQUE
// --------------------------
// Aucun son n'est émis sans clic. Les navigateurs bloquent de toute façon
// l'audio non sollicité, mais la raison principale est ailleurs : une voix qui
// démarre seule pendant qu'on montre un produit à un client est un incident,
// pas une fonctionnalité.

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { scriptPour } from "@/lib/demo/narration";

const CSS = `
.spc-narr{position:fixed;right:16px;bottom:16px;z-index:70;width:360px;max-width:calc(100vw - 32px);
  font-family:var(--font-geist-sans),system-ui,sans-serif;color:#E8EDF5}
.spc-narr *{box-sizing:border-box}
.spc-narr .panneau{background:#0D1E2E;border:1px solid #24405A;border-radius:16px;
  box-shadow:0 18px 48px rgba(0,8,30,.45);overflow:hidden}
.spc-narr .tete{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#12293C;
  border-bottom:1px solid #24405A}
.spc-narr .pastille{width:8px;height:8px;border-radius:50%;background:#F0B100;flex:none}
.spc-narr .titre{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9FB3C8}
.spc-narr .ecran{font-size:13px;font-weight:700;color:#FFF;margin-left:auto;
  max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.spc-narr .corps{padding:14px}
.spc-narr .etape-titre{font-size:14px;font-weight:700;color:#FFF;margin:0 0 6px}
.spc-narr .etape-texte{font-size:13.5px;line-height:1.62;color:#C7D5E4;margin:0}
.spc-narr .barre{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid #24405A;
  background:#0A1826}
.spc-narr button{font:inherit;cursor:pointer;border-radius:9px;border:1px solid transparent;
  display:inline-flex;align-items:center;justify-content:center;gap:6px}
.spc-narr button:focus-visible{outline:2px solid #7DD3E8;outline-offset:2px}
.spc-narr button[disabled]{opacity:.4;cursor:not-allowed}
.spc-narr .b-principal{background:#1A6B7E;color:#FFF;font-size:13px;font-weight:700;padding:8px 14px;flex:1}
.spc-narr .b-principal:hover:not([disabled]){background:#22849B}
.spc-narr .b-nav{background:transparent;border-color:#2F5473;color:#C7D5E4;font-size:12px;
  font-weight:600;padding:7px 10px;min-width:38px}
.spc-narr .b-nav:hover:not([disabled]){background:#183349;color:#FFF}
.spc-narr .b-replier{background:transparent;color:#9FB3C8;font-size:18px;line-height:1;
  padding:2px 6px;margin-left:8px}
.spc-narr .b-replier:hover{color:#FFF}
.spc-narr .jauge{display:flex;gap:4px;padding:0 14px 12px}
.spc-narr .jauge i{height:3px;flex:1;border-radius:2px;background:#24405A}
.spc-narr .jauge i.faite{background:#1A6B7E}
.spc-narr .jauge i.courante{background:#7DD3E8}
.spc-narr .compte{font-size:11px;color:#7E93A8;font-variant-numeric:tabular-nums;white-space:nowrap}
.spc-narr .note{font-size:11.5px;line-height:1.5;color:#7E93A8;padding:0 14px 12px;margin:0}
.spc-narr .inerte{font-size:13px;font-weight:600;color:#7E93A8;padding:8px 14px;flex:1;text-align:center}
.spc-narr .ouvrir{background:#0D1E2E;border:1px solid #24405A;color:#FFF;font-size:13px;font-weight:700;
  padding:11px 16px;border-radius:999px;box-shadow:0 10px 28px rgba(0,8,30,.42);float:right}
.spc-narr .ouvrir:hover{background:#12293C}
@media (max-width:640px){
  .spc-narr{right:8px;left:8px;bottom:8px;width:auto;max-width:none}
  .spc-narr .ecran{max-width:110px}
}
@media (prefers-reduced-motion:reduce){.spc-narr *{transition:none!important;animation:none!important}}
`;

/**
 * Chrome interrompt la synthèse vocale au bout d'une quinzaine de secondes
 * lorsque la page n'a pas le focus (bug connu de longue date). Un appel
 * périodique à `resume()` maintient la lecture. Inoffensif ailleurs :
 * `resume()` sur une file inactive ne fait rien.
 */
const RELANCE_MS = 10_000;

/**
 * Débit de parole (`rate`), pas hauteur de voix (`pitch`) — deux réglages
 * distincts qu'on confond volontiers. Ici on ralentit l'élocution ; la hauteur
 * reste à 1, la baisser rendrait la voix caverneuse.
 *
 * POURQUOI 0,85 ET PAS 0,75
 * -------------------------
 * En dessous de 0,80, la plupart des voix françaises système étirent les
 * voyelles et hachent la prosodie : le résultat n'est pas « posé », il est
 * « ralenti ». 0,85 est le point où la diction reste naturelle tout en laissant
 * le temps de suivre. Sur le script du cockpit — quatre étapes — cela ajoute
 * une dizaine de secondes ; 0,75 en aurait ajouté vingt-cinq.
 *
 * Valeur volontairement isolée ici : c'est un réglage d'oreille, qui se juge en
 * écoutant, pas en lisant du code. Une seule ligne à changer.
 */
const DEBIT = 0.85;

/**
 * Silence entre deux étapes.
 *
 * C'est LUI qui rend la narration pédagogique, davantage que la lenteur du
 * débit. Sans pause, la voix enchaîne une idée sur l'autre sans respiration, et
 * l'auditeur n'a pas le temps de rattacher ce qu'il vient d'entendre à ce qu'il
 * voit à l'écran. Sept dixièmes de seconde suffisent à marquer la césure sans
 * donner l'impression que la lecture s'est arrêtée.
 */
const PAUSE_ENTRE_ETAPES_MS = 700;

function synthese(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

/**
 * Disponibilité de la synthèse vocale, exposée en source externe plutôt qu'en
 * état posé depuis un effet. `useSyncExternalStore` est fait exactement pour
 * cela : l'instantané SERVEUR vaut `null` (« on ne sait pas encore », car le
 * serveur ignore ce dont le navigateur du visiteur est capable), et le premier
 * rendu client bascule sur la valeur réelle sans écart d'hydratation.
 */
function sabonnerVoix(notifier: () => void) {
  const synth = synthese();
  if (!synth) return () => {};
  synth.addEventListener("voiceschanged", notifier);
  return () => synth.removeEventListener("voiceschanged", notifier);
}
const instantaneClient = () => synthese() !== null;
const instantaneServeur = (): boolean | null => null;

/**
 * Voix française, choisie AU MOMENT DE PARLER et non au montage : les voix sont
 * chargées de façon asynchrone, et `getVoices()` rend très souvent un tableau
 * vide au premier appel. Au moment du clic, elles le sont.
 */
function voixFrancaise(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voix = synth.getVoices();
  return (
    voix.find((v) => v.lang === "fr-FR") ??
    voix.find((v) => v.lang?.toLowerCase().startsWith("fr")) ??
    null
  );
}

export function Narrateur() {
  const chemin = usePathname() ?? "/operations";
  const script = scriptPour(chemin);
  const etapes = script.etapes;

  const vocalDispo = useSyncExternalStore<boolean | null>(
    sabonnerVoix,
    instantaneClient,
    instantaneServeur,
  );

  const [ouvert, setOuvert] = useState(true);
  const [index, setIndex] = useState(0);
  const [lecture, setLecture] = useState(false);

  // Réinitialisation au changement d'écran, PENDANT le rendu plutôt que dans un
  // effet : ajuster un état lorsqu'une entrée change est le motif recommandé par
  // React, et il évite le rendu intermédiaire — sinon le nouvel écran
  // s'afficherait un instant avec l'étape de l'écran précédent.
  // L'arrêt du son est porté par le nettoyage de l'effet de lecture, déclenché
  // par le passage de `lecture` à `false`.
  const [cheminVu, setCheminVu] = useState(chemin);
  if (cheminVu !== chemin) {
    setCheminVu(chemin);
    setIndex(0);
    setLecture(false);
  }

  // Fonction simple, sans `useCallback` : elle n'est utilisée que dans des
  // gestionnaires d'événements, jamais comme dépendance d'effet. Une
  // mémoïsation manuelle ici empêcherait le compilateur React d'optimiser le
  // composant, pour aucun gain.
  function stopper() {
    synthese()?.cancel();
    setLecture(false);
  }

  // Arrêt à la fermeture de l'onglet ou au démontage : une voix qui continue de
  // parler sur une page quittée est difficile à faire taire pour le visiteur.
  useEffect(() => () => { synthese()?.cancel(); }, []);

  // Lecture de l'étape courante. Le nettoyage annule systématiquement : c'est
  // lui qui coupe le son au changement d'étape, de page, ou sur pause.
  useEffect(() => {
    if (!lecture) return;
    const synth = synthese();
    if (!synth) return;
    const etape = etapes[index];
    if (!etape) return;

    // `annule` distingue une fin NATURELLE d'une interruption. Sans lui, le
    // `cancel()` du nettoyage — qui déclenche `onend` sur plusieurs navigateurs
    // — faisait avancer d'une étape à chaque pause et à chaque changement
    // d'écran : on arrivait sur la page suivante à l'étape 2 sans l'avoir
    // demandé, et sans que rien ne soit lu.
    let annule = false;
    let attente: number | undefined;

    synth.cancel();

    const enonce = new SpeechSynthesisUtterance(`${etape.titre}. ${etape.texte}`);
    enonce.lang = "fr-FR";
    const voix = voixFrancaise(synth);
    if (voix) enonce.voice = voix;
    enonce.rate = DEBIT;
    enonce.pitch = 1;

    enonce.onend = () => {
      if (annule) return;
      if (index >= etapes.length - 1) {
        setLecture(false);
        return;
      }
      // La respiration entre deux idées — voir PAUSE_ENTRE_ETAPES_MS.
      attente = window.setTimeout(() => setIndex((i) => i + 1), PAUSE_ENTRE_ETAPES_MS);
    };
    // Une voix indisponible ou une lecture refusée ne doit pas figer le panneau
    // sur un bouton « Pause » qui ne correspond à aucun son.
    enonce.onerror = () => {
      if (!annule) setLecture(false);
    };

    synth.speak(enonce);
    const relance = window.setInterval(() => {
      if (synth.speaking) synth.resume();
    }, RELANCE_MS);

    return () => {
      annule = true;
      window.clearInterval(relance);
      if (attente !== undefined) window.clearTimeout(attente);
      synth.cancel();
    };
  }, [lecture, index, etapes]);

  const etape = etapes[index];
  if (!etape) return null;

  if (!ouvert) {
    return (
      <>
        <style>{CSS}</style>
        <div className="spc-narr">
          <button className="ouvrir" onClick={() => setOuvert(true)}>
            <span aria-hidden>💬</span> Explications
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <aside className="spc-narr" aria-label="Explications de la démonstration">
        <div className="panneau">
          <div className="tete">
            <span className="pastille" aria-hidden />
            <span className="titre">Démonstration</span>
            <span className="ecran">{script.ecran}</span>
            <button
              className="b-replier"
              onClick={() => { stopper(); setOuvert(false); }}
              aria-label="Replier les explications"
            >
              ×
            </button>
          </div>

          <div className="corps">
            {/* `aria-live` : le lecteur d'écran annonce le changement d'étape
                sans que l'utilisateur ait à retourner chercher le panneau. */}
            <div aria-live="polite">
              <h2 className="etape-titre">{etape.titre}</h2>
              <p className="etape-texte">{etape.texte}</p>
            </div>
          </div>

          {etapes.length > 1 && (
            <div className="jauge" aria-hidden>
              {etapes.map((_, i) => (
                <i key={i} className={i < index ? "faite" : i === index ? "courante" : ""} />
              ))}
            </div>
          )}

          {vocalDispo === false && (
            <p className="note">
              Votre navigateur ne propose pas de synthèse vocale. Les explications restent
              intégralement lisibles ci-dessus.
            </p>
          )}

          <div className="barre">
            <button
              className="b-nav"
              onClick={() => { stopper(); setIndex((i) => Math.max(0, i - 1)); }}
              disabled={index === 0}
              aria-label="Étape précédente"
            >
              ←
            </button>

            {/*
              `vocalDispo` vaut `null` au rendu serveur. On affiche alors le
              bouton — et non « indisponible » : le serveur ne peut pas savoir ce
              que le navigateur du visiteur sait faire, et annoncer une absence
              qu'on n'a pas constatée serait faux. Le cas négatif n'apparaît
              qu'une fois RÉELLEMENT établi.
            */}
            {vocalDispo === false ? (
              <span className="inerte">Lecture indisponible</span>
            ) : (
              <button
                className="b-principal"
                onClick={() => (lecture ? stopper() : setLecture(true))}
                disabled={vocalDispo === null}
              >
                {lecture ? "⏸ Pause" : "▶ Écouter"}
              </button>
            )}

            <button
              className="b-nav"
              onClick={() => { stopper(); setIndex((i) => Math.min(etapes.length - 1, i + 1)); }}
              disabled={index === etapes.length - 1}
              aria-label="Étape suivante"
            >
              →
            </button>

            <span className="compte">
              {index + 1} / {etapes.length}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
