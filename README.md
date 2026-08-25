# Suivi des BAES

Application de suivi des Blocs Autonomes d'Eclairage de Securite (BAES) pour un
etablissement scolaire : emplacement, etat, historique des tests et des
remplacements.

L'appli tourne sur un seul ordinateur (le serveur) et les 3 utilisateurs y
acceedent depuis n'importe quel PC ou telephone connecte au meme reseau local,
via un navigateur. Les donnees sont stockees dans un fichier SQLite local
(`data/baes.db`), sur cet ordinateur uniquement.

## Installation (a faire une seule fois)

Pre-requis : [Node.js](https://nodejs.org/) installe sur l'ordinateur qui
servira de serveur.

```bash
npm install
```

## Demarrage

```bash
npm start
```

La console affiche quelque chose comme :

```
Suivi BAES demarre sur http://0.0.0.0:3000
Accessible depuis ce PC via http://localhost:3000
Accessible depuis les autres postes du reseau local via l'IP de cette machine, ex: http://192.168.x.x:3000
```

- Sur l'ordinateur serveur : ouvrir `http://localhost:3000`
- Sur les autres PC / telephones du meme reseau local : trouver l'adresse IP
  locale de l'ordinateur serveur (sous Windows : `ipconfig`, chercher
  "Adresse IPv4" ; sous macOS/Linux : `ifconfig` ou `ip a`) puis ouvrir
  `http://<cette-adresse-ip>:3000` dans un navigateur.

Il faut que le pare-feu de l'ordinateur serveur autorise les connexions
entrantes sur le port 3000 pour que les autres postes puissent se connecter.

Le serveur doit rester lance (fenetre ouverte) pour que les autres postes
puissent y acceder. Pour l'arreter : `Ctrl+C` dans le terminal.

## Fonctionnalites

- Liste des BAES avec recherche et filtre par etat
- Fiche par BAES : batiment, etage, salle, reference, etat, date du dernier
  test, notes
- Historique des tests (date, resultat, commentaire) : ajouter un test met
  automatiquement a jour l'etat et la date du dernier test de la fiche
- Historique des remplacements (date, piece remplacee, commentaire)

## Sauvegarde des donnees

Toutes les donnees sont dans le fichier `data/baes.db`. Pour sauvegarder,
il suffit de copier ce fichier (l'application peut rester lancee).
