// Support de camera OV9732 pour anneau lumineux Target (Corona Vision, etc.)
// Style "bras + tete inclinee + capot avant", a imprimer en 3 exemplaires.
//
// Toutes les cotes sont en mm. MESUREZ VOTRE ANNEAU au pied a coulisse et
// reglez la section "Anneau" avant d'imprimer. Imprimez d'abord
// piece = "test_clip" (quelques minutes) pour verifier le serrage.
//
// Pieces : piece = "support" | "capot" | "test_clip" | "assemblage"

piece = "assemblage";

/* [Anneau lumineux Target] */
// Epaisseur du bord de l'anneau sur lequel le clip s'emboite
anneau_epaisseur = 10.0;
// Profondeur d'emboitement du clip sur le bord
clip_profondeur  = 14;
// Jeu du clip (0.2 = serre, 0.5 = libre ; la vis de serrage rattrape)
clip_jeu         = 0.3;

/* [Bras] */
// Longueur du bras entre le clip et la tete (vers le centre de la cible)
bras_longueur  = 30;
bras_largeur   = 20;
bras_epaisseur = 6;

/* [Camera OV9732] */
// Carte camera carree (32 pour les modules Autodarts, 38 pour les grands)
carte_cote      = 32;
// Entraxe des trous de fixation de la carte
carte_entraxe   = 28;
carte_epaisseur = 1.6;
// Hauteur libre derriere la carte (connecteur, composants)
espace_arriere  = 7;
// Ouverture pour le porte-objectif (carre M12 ~14 mm)
objectif_ouverture = 15;
// Inclinaison de la camera vers la cible (degres)
angle_camera   = 15;

/* [Divers] */
paroi       = 2.2;
capot_ep    = 2.5;
// Diametre de percage pour vis M2 auto-taraudeuses (piliers)
vis_m2_pilote = 1.7;
vis_m2_passage = 2.3;
// Diametre de percage pour la vis de serrage M3 du clip
vis_m3_pilote = 2.8;

$fn = 48;

// ---------- cotes derivees ----------
poche      = carte_cote + 0.6;                 // logement de la carte
tete_cote  = poche + 2 * paroi;                // section exterieure de la tete
tete_prof  = paroi + espace_arriere + carte_epaisseur;
fente      = anneau_epaisseur + clip_jeu;
clip_long  = fente + 2 * paroi + 1;            // encombrement en X du clip

// Repere : X = vers le centre de la cible, Z = vers l'avant (oppose au mur),
// Y = largeur du bras. Le bras est pose sur la face avant de l'anneau,
// le clip s'emboite sur le bord de l'anneau (ouverture vers le mur).

module clip() {
    difference() {
        translate([-clip_long, -bras_largeur/2, -clip_profondeur])
            cube([clip_long, bras_largeur, clip_profondeur + bras_epaisseur]);
        // fente pour le bord de l'anneau
        translate([-clip_long + paroi + 1, -bras_largeur/2 - 1, -clip_profondeur - 1])
            cube([fente, bras_largeur + 2, clip_profondeur + 1]);
        // vis de serrage M3 dans la joue exterieure
        translate([-clip_long - 1, 0, -clip_profondeur/2])
            rotate([0, 90, 0]) cylinder(d = vis_m3_pilote, h = paroi + 3);
    }
}

module bras() {
    translate([-0.01, -bras_largeur/2, 0])
        cube([bras_longueur + 0.02, bras_largeur, bras_epaisseur]);
}

// Tete dans son repere local : axe optique = +X, face avant a x = 0
module tete_pleine_locale() {
    translate([-tete_prof, -tete_cote/2, -tete_cote/2])
        cube([tete_prof, tete_cote, tete_cote]);
}

module tete_vides_locale() {
    // logement de la carte (ouvert a l'avant)
    translate([-tete_prof + paroi, -poche/2, -poche/2])
        cube([tete_prof, poche, poche]);
    // passage du cable a l'arriere (vers le haut / l'avant)
    translate([-tete_prof - 1, -6, 0])
        cube([paroi + 2, 12, tete_cote]);
}

module piliers_locaux() {
    for (sy = [-1, 1], sz = [-1, 1])
        translate([-tete_prof + paroi - 0.5, sy * carte_entraxe/2, sz * carte_entraxe/2])
            rotate([0, 90, 0])
            difference() {
                cylinder(d = 4.0, h = espace_arriere + 0.5);
                translate([0, 0, 1.5]) cylinder(d = vis_m2_pilote, h = espace_arriere + 1);
            }
}

// placement de la tete au bout du bras, inclinee vers le mur
module placer_tete() {
    // le coin arriere-bas de la tete vient se poser sur le bout du bras
    translate([bras_longueur + tete_prof * cos(angle_camera) + tete_cote/2 * sin(angle_camera), 0,
               tete_cote/2 * cos(angle_camera) - tete_prof * sin(angle_camera)])
        rotate([0, angle_camera, 0])
            children();
}

module support() {
    difference() {
        union() {
            clip();
            bras();
            hull() {
                translate([bras_longueur - 12, -bras_largeur/2, 0])
                    cube([12, bras_largeur, bras_epaisseur]);
                placer_tete() tete_pleine_locale();
            }
        }
        placer_tete() tete_vides_locale();
    }
    placer_tete() piliers_locaux();
}

module capot() {
    difference() {
        union() {
            translate([-tete_cote/2, -tete_cote/2, 0])
                cube([tete_cote, tete_cote, capot_ep]);
            // collerette autour de l'objectif (pare-lumiere)
            cylinder(d = objectif_ouverture * 1.414 + 4, h = capot_ep + 4);
        }
        // ouverture objectif (carree, en diagonale incluse)
        translate([-objectif_ouverture/2, -objectif_ouverture/2, -1])
            cube([objectif_ouverture, objectif_ouverture, capot_ep + 2]);
        translate([0, 0, capot_ep])
            cylinder(d = objectif_ouverture * 1.414 + 0.4, h = 10);
        // trous de fixation M2 (traversent capot + carte -> piliers)
        for (sx = [-1, 1], sy = [-1, 1])
            translate([sx * carte_entraxe/2, sy * carte_entraxe/2, -1]) {
                cylinder(d = vis_m2_passage, h = capot_ep + 2);
            }
    }
}

module test_clip() {
    intersection() {
        support();
        translate([-clip_long - 1, -50, -clip_profondeur - 1])
            cube([clip_long + 6, 100, clip_profondeur + bras_epaisseur + 2]);
    }
}

// Orientation d'impression : couche sur le flanc (Y vers le bas),
// le profil clip/bras/tete est alors dans le plan du plateau -> solide.
if (piece == "support")
    rotate([90, 0, 0]) translate([0, bras_largeur/2 > tete_cote/2 ? bras_largeur/2 : tete_cote/2, 0]) support();
else if (piece == "capot")
    capot();
else if (piece == "test_clip")
    rotate([90, 0, 0]) translate([0, bras_largeur/2, 0]) test_clip();
else {
    support();
    %placer_tete() translate([0.5, 0, 0]) rotate([0, 90, 0]) rotate([0, 0, 0]) capot();
}
