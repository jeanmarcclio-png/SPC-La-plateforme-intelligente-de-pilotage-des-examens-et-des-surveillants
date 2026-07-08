// Détection de l'entrée de navigation active (pure, testable sans React).
// « /operations » (Dashboard) ne matche qu'en exact pour ne pas capturer
// toutes les sous-routes ; les autres restent actives sur leurs sous-pages
// (ex. /operations/devis/13 → « Devis » actif).
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/operations") return pathname === "/operations";
  return pathname === href || pathname.startsWith(href + "/");
}
