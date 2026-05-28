# WidgetGRIST
Widget pour GRIST


## 🔧 Utilisation dans Grist

1. Dans une page Grist, ajouter une section **Widget personnalisé**
2. Coller l'URL GitHub Pages du widget : https://angect.github.io/WidgetIterationCreator/
3. Sélectionner la table source dans le panneau latéral
4. Choisir le niveau d'accès : **Lire la table**
5. *(optionnel)* Cliquer sur **Open configuration** pour personnaliser le titre et la couleur

## 🗂️ Structure du projet

WidgetGRIST/
├── index.html
├── lib/
│   ├── grist-table.js
│   ├── grist-select.js
│   ├── grist-combobox.js
│   └── grist-form.js
├── widgets/
│   ├── creationIteration/
│   │   ├── index.html
|   |   ├── widget.css
│   │   └── widget.js
│   └── # Futur widget se créer ici
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml
