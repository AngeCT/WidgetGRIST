# WidgetGRIST
Bibliothèque de widget qui servent à rendre GRIST plus simple et visuel

## 🔧 Utilisation dans Grist

1. Dans une page Grist, ajouter une section **Widget personnalisé**
2. Coller l'URL du widget
3. Sélectionner la table source dans le panneau latéral
4. Choisir le niveau d'accès

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
