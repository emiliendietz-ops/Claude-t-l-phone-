// Porte-manteau mural — modèle paramétrique OpenSCAD
// Toutes les cotes sont en millimètres.
//
// Orientation : le modèle est déjà posé sur le flanc, prêt à imprimer.
// Les couches suivent la courbe du crochet, ce qui le rend bien plus
// solide que s'il était imprimé debout, et aucun support n'est nécessaire.

/* [Plaque murale] */
hauteur_plaque   = 90;   // hauteur contre le mur
epaisseur_plaque = 6;    // épaisseur de la plaque
largeur          = 25;   // largeur de la pièce (= hauteur d'impression)

/* [Crochet] */
avancee          = 55;   // distance entre le mur et le bout du crochet
rayon_bras       = 6;    // demi-épaisseur du bras (bras de 12 mm)
rayon_bouton     = 7.5;  // boule au bout du crochet
hauteur_bout     = 36;   // hauteur du bout relevé

/* [Vis] */
diametre_vis     = 4.5;  // vis de 4 mm
diametre_tete    = 9;    // tête fraisée
z_vis            = [54, 78]; // position des deux trous

$fn = 64;

module profil() {
    // plaque murale aux coins arrondis
    offset(r = 2) offset(delta = -2)
        square([epaisseur_plaque, hauteur_plaque]);

    // renfort entre la plaque et le bras
    hull() {
        translate([0, 8]) square([epaisseur_plaque, 38]);
        translate([22, 14]) circle(r = rayon_bras);
    }

    // bras : suite de segments arrondis
    points = [
        [epaisseur_plaque, 18],
        [22, 14],
        [avancee - 10, 13],
        [avancee, 22],
        [avancee + 1, hauteur_bout - 6]
    ];
    for (i = [0 : len(points) - 2])
        hull() {
            translate(points[i])     circle(r = rayon_bras);
            translate(points[i + 1]) circle(r = rayon_bras);
        }

    // boule au bout pour retenir les vêtements
    translate([avancee + 1, hauteur_bout]) circle(r = rayon_bouton);
}

module trou_vis(z) {
    // percé de part en part, fraisé du côté visible (x = épaisseur)
    translate([-1, z, largeur / 2]) rotate([0, 90, 0]) {
        cylinder(d = diametre_vis, h = epaisseur_plaque + 2);
        translate([0, 0, epaisseur_plaque + 1 - (diametre_tete - diametre_vis) / 2])
            cylinder(d1 = diametre_vis, d2 = diametre_tete,
                     h = (diametre_tete - diametre_vis) / 2 + 0.01);
        translate([0, 0, epaisseur_plaque + 1]) cylinder(d = diametre_tete, h = 5);
    }
}

difference() {
    linear_extrude(height = largeur) profil();
    for (z = z_vis) trou_vis(z);
}
