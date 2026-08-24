"use client";

// Verrou de soumission SYNCHRONE — corrige BUG-012 de l'audit QA forensic V2.
//
// Les formulaires portaient `disabled={pending}` avec `pending` issu de
// `useTransition`. Ce drapeau ne bascule qu'au rendu SUIVANT : trois clics dans
// le même tick passaient tous. Mesuré en pilotage réel : 3 clics rapides sur
// « Créer la mission » → 3 requêtes POST.
//
// Un `useRef` est posé AVANT l'appel : il est effectif immédiatement, sans
// attendre de rendu. Il est relâché quand le traitement se termine.

import { useCallback, useEffect, useRef } from "react";

/** Filet de sécurité : si `pending` ne redescend jamais, on rouvre le formulaire. */
const DELAI_SECURITE_MS = 10_000;

export function useSoumissionUnique(
  onSubmit: (fd: FormData) => void,
  pending: boolean,
): (e: React.FormEvent<HTMLFormElement>) => void {
  const verrou = useRef(false);
  const etaitPending = useRef(false);

  // Relâche le verrou dès que le traitement déclenché est terminé.
  useEffect(() => {
    if (pending) etaitPending.current = true;
    else if (etaitPending.current) {
      etaitPending.current = false;
      verrou.current = false;
    }
  }, [pending]);

  // Filet : jamais de formulaire définitivement bloqué si `pending` reste faux
  // (action synchrone, erreur avalée, transition non déclenchée).
  useEffect(() => {
    if (!verrou.current) return;
    const t = setTimeout(() => { verrou.current = false; }, DELAI_SECURITE_MS);
    return () => clearTimeout(t);
  }, [pending]);

  return useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (verrou.current) return; // rafale de clics : on ignore les suivants
      verrou.current = true;
      onSubmit(new FormData(e.currentTarget));
    },
    [onSubmit],
  );
}
