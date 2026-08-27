# Applications de la cite scolaire

Ce projet regroupe deux applications independantes, servies par le meme
serveur mais chacune sur sa propre URL (pas de page d'accueil commune) :

- **Suivi des BAES** (`/`) : suivi des Blocs Autonomes d'Eclairage de
  Securite - emplacement, etat, historique des tests et des remplacements.
- **Suivi entretien annuel** (`/entretien`) : suivi des entreprises a
  contacter et des rendez-vous a prendre pour l'entretien annuel des divers
  equipements de la cite scolaire (chaudieres, ascenseurs, extincteurs...).

L'appli tourne sur un seul ordinateur (le serveur) et les utilisateurs y
acceedent depuis n'importe quel PC ou telephone connecte au meme reseau local,
via un navigateur. Les donnees sont stockees dans un fichier SQLite local
(`data/baes.db`), sur cet ordinateur uniquement.

## Installation (a faire une seule fois)

Pre-requis : [Node.js](https://nodejs.org/) installe sur l'ordinateur qui
servira de serveur (ici le serveur `horus-ng`).

Copier le dossier du projet sur le **disque local** du serveur (par exemple
`C:\Applications\suivi-cite-scolaire`), pas sur un lecteur reseau partage
(`P:\...`) : l'application et sa base de donnees doivent rester sur la
machine qui l'execute.

Puis, dans une invite de commandes ouverte dans ce dossier :

```bash
npm install
```

## Demarrage

```bash
npm start
```

Sous Windows, un double-clic sur `demarrer.bat` (a la racine du projet)
fait la meme chose sans avoir a ouvrir une invite de commandes.

La console affiche quelque chose comme :

```
Suivi BAES demarre sur http://0.0.0.0:3000
Suivi entretien annuel disponible sur http://0.0.0.0:3000/entretien
Accessible depuis ce PC via http://localhost:3000
Accessible depuis les autres postes du reseau local via l'IP de cette machine, ex: http://192.168.x.x:3000
```

- Sur l'ordinateur serveur : ouvrir `http://localhost:3000` (BAES) ou
  `http://localhost:3000/entretien` (entretien annuel)
- Sur les autres PC / telephones du meme reseau local : trouver l'adresse IP
  locale de l'ordinateur serveur (sous Windows : `ipconfig`, chercher
  "Adresse IPv4" ; sous macOS/Linux : `ifconfig` ou `ip a`) puis ouvrir
  `http://<cette-adresse-ip>:3000` ou `http://<cette-adresse-ip>:3000/entretien`
  dans un navigateur.

Il faut que le pare-feu de l'ordinateur serveur autorise les connexions
entrantes sur le port 3000 pour que les autres postes puissent se connecter.

Le serveur doit rester lance (fenetre ouverte) pour que les autres postes
puissent y acceder. Pour l'arreter : `Ctrl+C` dans le terminal (ou fermer la
fenetre).

### Demarrage automatique au demarrage de horus-ng (optionnel)

Pour eviter d'avoir a relancer `demarrer.bat` a la main apres un redemarrage
du serveur :

1. Ouvrir le Planificateur de taches Windows (`taskschd.msc`).
2. Creer une tache declenchee "Au demarrage de l'ordinateur" (ou "A l'ouverture
   de session" si un compte se connecte automatiquement).
3. Action : demarrer un programme -> selectionner `demarrer.bat` dans le
   dossier du projet.
4. Cocher "Executer avec les autorisations maximales" et, si besoin,
   "Executer que l'utilisateur soit connecte ou non".

## Suivi des BAES

### Fonctionnalites

- Liste des BAES avec recherche et filtre par etat
- Fiche par BAES : batiment, etage, salle, reference, etat, date du dernier
  test, notes
- Historique des tests (date, resultat, commentaire) : ajouter un test met
  automatiquement a jour l'etat et la date du dernier test de la fiche
- Historique des remplacements (date, piece remplacee, commentaire)

## Suivi entretien annuel

### Fonctionnalites

- Liste des entreprises a contacter avec recherche et filtre par statut
  (A contacter, Contactee, RDV planifie, Intervention faite)
- Fiche par entreprise : nom, equipement concerne, telephone, email, statut,
  date du dernier contact, notes
- Rendez-vous (date, heure, objet, statut, commentaire) : ajouter un RDV met
  automatiquement a jour le statut et la date de dernier contact de
  l'entreprise

## Sauvegarde des donnees

Toutes les donnees (BAES et entretien annuel) sont dans le meme fichier
`data/baes.db`. Pour sauvegarder, il suffit de copier ce fichier
(l'application peut rester lancee).
