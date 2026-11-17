"""Génère le registre BAES (HTML puis PDF A4).

Utilisation :  python3 build.py
Produit :      registre-baes.html et registre-baes.pdf dans ce dossier.
"""
import pathlib
import subprocess

ICI = pathlib.Path(__file__).parent
NB_BLOCS = 50          # blocs prévus dans l'inventaire et le test d'autonomie
MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet",
        "Août", "Septembre", "Octobre", "Novembre", "Décembre"]


def page(titre, contenu, sous_titre=""):
    st = f'<p class="sous-titre">{sous_titre}</p>' if sous_titre else ""
    return f"""
<section class="page">
  <header><span class="marque">Registre BAES</span><span class="etab">Établissement : ............................................</span></header>
  <h2>{titre}</h2>{st}
  {contenu}
  <footer>Document à conserver et à annexer au registre de sécurité de l'établissement.</footer>
</section>"""


def tableau(entetes, nb_lignes, largeurs=None, premiere_col=None, haut="9.2mm"):
    cols = "".join(f'<col style="width:{w}">' for w in largeurs) if largeurs else ""
    th = "".join(f"<th>{e}</th>" for e in entetes)
    lignes = []
    for i in range(nb_lignes):
        cellules = ["<td></td>"] * len(entetes)
        if premiere_col:
            cellules[0] = f'<td class="num">{premiere_col(i)}</td>'
        lignes.append(f'<tr style="height:{haut}">{"".join(cellules)}</tr>')
    return f'<table><colgroup>{cols}</colgroup><thead><tr>{th}</tr></thead><tbody>{"".join(lignes)}</tbody></table>'


def couverture():
    champs = ["Nom de l'établissement", "Adresse", "Type et catégorie (ERP / lieu de travail)",
              "Responsable / exploitant", "Téléphone", "Entreprise de maintenance", "Téléphone maintenance",
              "Nombre de blocs installés", "Registre ouvert le"]
    lignes = "".join(f'<div class="champ"><span>{c}</span><div class="ligne"></div></div>' for c in champs)
    return f"""
<section class="page couverture">
  <div class="bandeau">
    <p class="sur-titre">Éclairage de sécurité</p>
    <h1>Registre de vérification<br>des blocs autonomes</h1>
    <p class="types">BAES · BAEH · LSC</p>
  </div>
  <div class="annee">Année <span>20 ........</span></div>
  <div class="champs">{lignes}</div>
  <p class="note-couv">Contrôles mensuels · tests d'autonomie · inventaire · interventions · vérifications annuelles</p>
</section>"""


def mode_emploi():
    return page("Mode d'emploi", """
<ol class="etapes">
  <li><b>Remplissez l'inventaire</b> une fois : numérotez chaque bloc (étiquette sur le bloc) et notez son emplacement.</li>
  <li><b>Chaque mois</b>, faites le contrôle de fonctionnement et notez-le dans la page « Contrôles mensuels ».</li>
  <li><b>Tous les six mois</b>, faites le test d'autonomie et cochez le résultat de chaque bloc.</li>
  <li><b>À chaque réparation</b> (lampe, batterie, bloc remplacé), notez-la dans le journal des interventions.</li>
  <li><b>Une fois par an</b>, faites vérifier l'installation par un technicien compétent et notez-le ; annexez son rapport.</li>
  <li>Présentez ce registre lors des visites de la commission de sécurité ou de l'inspection du travail.</li>
</ol>
<h3>Périodicités usuelles</h3>
<table class="perio">
  <thead><tr><th>Quand</th><th>Quoi</th><th>Par qui</th></tr></thead>
  <tbody>
    <tr><td>Tous les mois</td><td>Passage en position de sécurité (coupure de l'alimentation normale) : chaque bloc s'allume, lampes et voyants en bon état.</td><td>Exploitant</td></tr>
    <tr><td>Tous les 6 mois</td><td>Test d'autonomie : les blocs doivent rester allumés pendant toute la durée assignée (1 h en général).</td><td>Exploitant</td></tr>
    <tr><td>Tous les ans</td><td>Vérification de l'installation (état, fixation, signalisation, batteries).</td><td>Technicien compétent</td></tr>
    <tr><td>Selon fabricant</td><td>Remplacement des batteries (souvent tous les 4 ans environ).</td><td>Technicien</td></tr>
  </tbody>
</table>
<p class="avertissement"><b>Important :</b> ces périodicités sont celles généralement appliquées. Les obligations exactes dépendent du type d'établissement (ERP, lieu de travail, habitation) et de sa catégorie. Vérifiez les textes en vigueur ou demandez à votre prestataire. Les blocs autotestables (SATI) font eux-mêmes une partie des tests, mais les résultats doivent quand même être relevés.</p>
""")


def inventaire():
    pages = []
    for debut in range(0, NB_BLOCS, 25):
        pages.append(page(
            "Inventaire des blocs",
            tableau(["N°", "Emplacement", "Type", "Marque / référence", "SATI", "Mise en service", "Batterie changée le"],
                    25, ["7%", "26%", "11%", "20%", "7%", "14%", "15%"], lambda i, d=debut: d + i + 1),
            f"Blocs {debut + 1} à {debut + 25} · Type : évacuation, ambiance (anti-panique), BAEH, LSC"))
    return "".join(pages)


def mensuels():
    return page(
        "Contrôles mensuels",
        tableau(["Mois", "Date", "Contrôlé par", "Blocs OK", "Blocs en défaut (n°)", "Action prévue", "Visa"],
                12, ["13%", "11%", "17%", "9%", "20%", "20%", "10%"], lambda i: MOIS[i], haut="16.5mm"),
        "Coupez l'alimentation normale : chaque bloc doit s'allumer. Notez les numéros des blocs qui ne s'allument pas.")


def autonomie():
    def grille(titre):
        cases = "".join(f'<div class="case"><b>{n}</b><span>☐ OK</span><span>☐ HS</span></div>' for n in range(1, NB_BLOCS + 1))
        return f"""
<div class="semestre">
  <h3>{titre}</h3>
  <p class="infos">Date : ............................ &nbsp; Heure de coupure : ........... &nbsp; Durée du test : ........... &nbsp; Par : ...................................</p>
  <div class="grille">{cases}</div>
  <p class="infos">Observations : ..............................................................................................................................</p>
</div>"""
    return page("Tests d'autonomie", grille("1er semestre") + grille("2e semestre"),
                "Coupez l'alimentation normale pendant la durée assignée (1 h en général). Cochez HS pour tout bloc éteint avant la fin.")


def interventions():
    contenu = tableau(["Date", "N° bloc", "Défaut constaté", "Intervention réalisée", "Intervenant", "Visa"],
                      22, ["12%", "9%", "24%", "27%", "17%", "11%"])
    return "".join(page("Journal des interventions", contenu,
                        "Lampe, batterie, bloc remplacé, déplacé ou ajouté…") for _ in range(2))


def annuelles():
    contenu = tableau(["Date", "Organisme / technicien", "Objet de la vérification", "Observations / réserves", "Levée des réserves le", "Visa"],
                      10, ["11%", "20%", "20%", "25%", "13%", "11%"], haut="19mm")
    return page("Vérifications annuelles", contenu, "Annexez au registre chaque rapport de vérification.")


CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1d2329; font-size: 10pt; }
.page { width: 210mm; height: 297mm; padding: 14mm 14mm 12mm; position: relative; page-break-after: always; overflow: hidden; }
header { display: flex; justify-content: space-between; font-size: 8pt; color: #5b6670; border-bottom: 1.5px solid #1f8a4c; padding-bottom: 2mm; margin-bottom: 5mm; }
.marque { font-weight: 700; color: #1f8a4c; letter-spacing: .04em; text-transform: uppercase; }
footer { position: absolute; bottom: 7mm; left: 14mm; right: 14mm; font-size: 7.5pt; color: #8a949c; text-align: center; }
h2 { font-size: 17pt; margin: 0 0 1.5mm; }
h3 { font-size: 11.5pt; margin: 5mm 0 2mm; color: #1f8a4c; }
.sous-titre { color: #5b6670; margin: 0 0 4mm; font-size: 9pt; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { background: #1f8a4c; color: #fff; font-size: 8.5pt; font-weight: 600; padding: 2mm 1.5mm; text-align: left; border: 1px solid #1f8a4c; }
td { border: 1px solid #b9c2c9; padding: 1mm 1.5mm; font-size: 9pt; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f4f8f5; }
td.num { font-weight: 600; color: #1f8a4c; vertical-align: middle; }
.couverture { padding: 0; }
.bandeau { background: #1f8a4c; color: #fff; padding: 30mm 20mm 18mm; }
.bandeau h1 { font-size: 30pt; line-height: 1.15; margin: 3mm 0 5mm; }
.sur-titre { text-transform: uppercase; letter-spacing: .15em; font-size: 10pt; margin: 0; opacity: .85; }
.types { font-size: 12pt; margin: 0; font-weight: 600; }
.annee { margin: 12mm 20mm 6mm; font-size: 16pt; font-weight: 700; }
.annee span { font-weight: 400; color: #5b6670; }
.champs { margin: 0 20mm; }
.champ { display: flex; align-items: flex-end; gap: 4mm; margin-bottom: 7mm; }
.champ span { white-space: nowrap; font-size: 10pt; color: #3a444c; }
.champ .ligne { flex: 1; border-bottom: 1px dotted #7d8890; height: 5mm; }
.note-couv { position: absolute; bottom: 14mm; left: 20mm; right: 20mm; text-align: center; color: #5b6670; font-size: 9pt; }
.etapes li { margin-bottom: 2.5mm; line-height: 1.45; }
.perio td { padding: 2mm; line-height: 1.4; }
.avertissement { margin-top: 6mm; background: #fff7e6; border-left: 3px solid #e0a020; padding: 3mm 4mm; font-size: 9pt; line-height: 1.45; }
.semestre { margin-bottom: 4mm; }
.semestre h3 { margin-top: 2mm; }
.infos { font-size: 9pt; margin: 1.5mm 0 2.5mm; color: #3a444c; }
.grille { display: grid; grid-template-columns: repeat(10, 1fr); border-top: 1px solid #b9c2c9; border-left: 1px solid #b9c2c9; }
.case { border-right: 1px solid #b9c2c9; border-bottom: 1px solid #b9c2c9; padding: 1mm 1.5mm; font-size: 7.5pt; display: flex; flex-direction: column; gap: .4mm; }
.case b { color: #1f8a4c; font-size: 9pt; }
"""


def main():
    html = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Registre de vérification BAES</title>
<style>{CSS}</style></head><body>
{couverture()}{mode_emploi()}{inventaire()}{mensuels()}{autonomie()}{interventions()}{annuelles()}
</body></html>"""
    (ICI / "registre-baes.html").write_text(html, encoding="utf-8")
    subprocess.run(["node", "-e", f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://{(ICI / "registre-baes.html").resolve()}');
  await p.pdf({{ path: '{(ICI / "registre-baes.pdf").resolve()}', format: 'A4', printBackground: true, preferCSSPageSize: true }});
  await b.close();
}})();"""], check=True)
    print("OK : registre-baes.pdf généré")


if __name__ == "__main__":
    main()
