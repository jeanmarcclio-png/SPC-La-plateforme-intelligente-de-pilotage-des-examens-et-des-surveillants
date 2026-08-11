#!/usr/bin/env python3
"""Génère les lots de recette à partir de supabase/migrations/.

    python3 supabase/recette/generer-lots.py

Pourquoi des lots plutôt qu'un fichier unique : le SQL Editor de Supabase passe
par l'API du dashboard, qui échoue sur un envoi de ~108 Ko avec
« Failed to fetch (api.supabase.com) ». Ce n'est pas une erreur SQL.

Pourquoi une transformation : coller sept morceaux à la main impose de pouvoir
RELANCER celui qui casse. Tables, colonnes, index et vues étaient déjà en
« if not exists » / « or replace » ; les politiques RLS ne l'étaient pas. Chaque
`create policy` ACTIF est donc précédé de son `drop policy if exists`.

Piège traité : les `create policy` figurant EN COMMENTAIRE (documentation de la
migration 19) ne doivent pas être touchés — insérer un drop devant décommentait
la ligne suivante et rendait quatre politiques actives par accident.

Le script vérifie son propre résultat et sort en erreur au moindre écart.
"""

import os
import re
import sys
import glob
import difflib

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # supabase/
SOURCE = os.path.join(RACINE, "migrations")
DESTINATION = os.path.join(RACINE, "recette", "migrations-par-lots")
LIMITE_OCTETS = 18_000

RE_POLICY = re.compile(
    r'create\s+policy\s+("([^"]+)"|\'([^\']+)\'|[a-zA-Z_]\w*)\s+on\s+([\w.]+)', re.I
)


def migrations() -> list[str]:
    """Fichiers de migration, dans leur ORDRE DE DÉPENDANCE (01 … 32)."""
    return sorted(
        glob.glob(os.path.join(SOURCE, "*.sql")),
        key=lambda p: (int(re.match(r"(\d+)", os.path.basename(p)).group(1)),
                       os.path.basename(p)),
    )


def dans_commentaire(texte: str, position: int) -> bool:
    """La position tombe-t-elle après un `--` sur sa propre ligne ?"""
    debut = texte.rfind("\n", 0, position) + 1
    return "--" in texte[debut:position]


def rendre_rejouable(sql: str) -> tuple[str, int]:
    """Précède chaque `create policy` ACTIF de son `drop policy if exists`."""
    morceaux, n, dernier = [], 0, 0
    for m in RE_POLICY.finditer(sql):
        if dans_commentaire(sql, m.start()):
            continue
        nom = m.group(2) or m.group(3) or m.group(1)
        morceaux.append(sql[dernier:m.start()])
        morceaux.append(f'drop policy if exists "{nom}" on {m.group(4)};\n')
        dernier = m.start()
        n += 1
    morceaux.append(sql[dernier:])
    return "".join(morceaux), n


def decouper(blocs: list[tuple[str, str]]) -> list[list[tuple[str, str]]]:
    """Découpe aux FRONTIÈRES DE MIGRATION, jamais au milieu de l'une d'elles."""
    lots, courant, taille = [], [], 0
    for nom, sql in blocs:
        if courant and taille + len(sql) > LIMITE_OCTETS:
            lots.append(courant)
            courant, taille = [], 0
        courant.append((nom, sql))
        taille += len(sql)
    if courant:
        lots.append(courant)
    return lots


def entete(i: int, total: int, noms: list[str]) -> str:
    numeros = ", ".join(n.split("_")[0] for n in noms)
    return f"""-- ============================================================================
-- SPC Opérations — RECETTE · LOT {i}/{total}
--
-- Migrations de ce lot : {numeros}
--
-- Généré par supabase/recette/generer-lots.py — ne pas éditer à la main.
--
-- À coller dans Supabase → SQL Editor → Run. LOTS DANS L'ORDRE : 1, puis 2, etc.
-- Attendre la fin d'un lot avant de lancer le suivant.
--
-- SÛR À REJOUER : tables, colonnes, index et vues en « if not exists » /
-- « or replace », et chaque politique RLS précédée de son « drop policy if
-- exists ». Un lot interrompu se relance depuis son début, sans risque.
-- ============================================================================
"""


def verifier(lots_ecrits: list[str], fichiers: list[str]) -> None:
    """Contrôles bloquants. Un seul écart et le script sort en erreur."""
    concat = "".join(open(p, encoding="utf-8").read() for p in sorted(lots_ecrits))
    original = "".join(open(p, encoding="utf-8").read().rstrip() + "\n" for p in fichiers)
    echecs = []

    attendus = [os.path.basename(p) for p in fichiers]
    if re.findall(r"-- ── MIGRATION (\S+)", concat) != attendus:
        echecs.append("les migrations ne sont pas toutes présentes, ou pas dans l'ordre")

    def noyau(t: str) -> list[str]:
        return [l.strip() for l in t.splitlines()
                if l.strip()
                and not l.strip().startswith("--")
                and not l.strip().startswith("drop policy if exists")]

    diff = list(difflib.unified_diff(noyau(original), noyau(concat), "original", "lots",
                                     n=0, lineterm=""))
    if diff:
        echecs.append("le SQL métier diffère de l'original :\n" + "\n".join(diff[:20]))

    orphelines = []
    for m in re.finditer(r'create\s+policy\s+"([^"]+)"\s+on\s+([\w.]+)', concat, re.I):
        if dans_commentaire(concat, m.start()):
            continue
        avant = concat[max(0, m.start() - 250):m.start()]
        if f'drop policy if exists "{m.group(1)}" on {m.group(2)};' not in avant:
            orphelines.append(m.group(1))
    if orphelines:
        echecs.append(f"politiques actives sans drop préalable : {orphelines}")

    def actives(t: str) -> int:
        return sum(1 for m in re.finditer(r"create\s+policy\s", t, re.I)
                   if not dans_commentaire(t, m.start()))
    if actives(original) != actives(concat):
        echecs.append(f"nombre de politiques actives modifié : "
                      f"{actives(original)} → {actives(concat)} "
                      f"(une politique commentée a probablement été décommentée)")

    if echecs:
        for e in echecs:
            print(f"ÉCHEC — {e}", file=sys.stderr)
        sys.exit(1)
    print("vérifications : ordre ✓ · SQL identique ✓ · drops complets ✓ · "
          f"politiques actives inchangées ({actives(concat)}) ✓")


def main() -> None:
    fichiers = migrations()
    blocs, total_drops = [], 0
    for p in fichiers:
        sql, n = rendre_rejouable(open(p, encoding="utf-8").read().rstrip())
        total_drops += n
        blocs.append((os.path.basename(p), sql))

    lots = decouper(blocs)
    os.makedirs(DESTINATION, exist_ok=True)
    for obsolete in glob.glob(os.path.join(DESTINATION, "lot-*.sql")):
        os.remove(obsolete)

    ecrits = []
    for i, lot in enumerate(lots, 1):
        corps = "".join(
            f"\n\n-- ── MIGRATION {nom} ───────────────────────────────────────────\n{sql}\n"
            for nom, sql in lot
        )
        chemin = os.path.join(DESTINATION, f"lot-{i:02d}.sql")
        open(chemin, "w", encoding="utf-8").write(entete(i, len(lots), [n for n, _ in lot]) + corps)
        ecrits.append(chemin)
        numeros = ", ".join(n.split("_")[0] for n, _ in lot)
        print(f"lot {i}/{len(lots)} : {numeros:<28} {os.path.getsize(chemin) / 1024:5.1f} Ko")

    print(f"\n{len(fichiers)} migrations · {total_drops} politiques rendues rejouables")
    verifier(ecrits, fichiers)


if __name__ == "__main__":
    main()
