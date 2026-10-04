# MedAnon V2 — OCR certificats

Branche isolée : `v2/ocr-certificats`. La branche main reste inchangée.

- Coordonnées des mots extraites des blocs Tesseract v7 explicitement demandés.
- Segmentation automatique puis seconde lecture en mode texte dispersé pour les documents courts ou peu confiants.
- PDF rendus à 3x ; lecture raster même si le PDF comporte un en-tête textuel (cas PDF mixtes).
- Un worker réutilisé et libéré en fin de traitement.
- Message explicite si aucun mot ne peut être localisé.

Validation : `node --test frontend/tests/ocrEngine.test.mjs` (4 tests).
Ces tests vérifient la logique et le format de coordonnées avec un moteur simulé.
La reconnaissance réelle, le build complet et l'APK restent à valider.
Aucun certificat réel n'a été fourni pour reproduire le problème rapporté.
Vérifier en particulier un certificat court, un scan PDF et un PDF mixte ; contrôler visuellement toutes les zones avant export.
La reconnaissance manuscrite n'est pas garantie.

## Deux applications indépendantes

V1 : `ch.medanon.local` / MedAnon Local, code de référence `a978db000d81f17a6daf8600f93dcd8c52524385`.
V2 : `ch.medanon.local.v2` / MedAnon V2, branche `v2/ocr-certificats`.
Les identifiants distincts permettent une installation côte à côte et des espaces de données séparés.
Le workflow V2 ne déploie pas la PWA et ne pousse aucun changement sur main.
Chaque build V2 est conservé dans une Release propre à son commit et sa plateforme, en complément des artifacts temporaires.

Construire depuis la racine : `bash scripts/build-mobile.sh android` ou `bash scripts/build-mobile.sh ios`.
Le build iOS produit une archive non signée, pas une IPA installable. La distribution sur iPhone demande la configuration Apple adéquate.
Les APK debug produits sur des runners différents peuvent avoir des signatures différentes : une mise à jour directe n'est pas garantie tant qu'une clé stable n'est pas configurée.
Les releases restent disponibles tant que le dépôt et les fichiers sont conservés ; il ne s'agit pas d'une garantie d'accès perpétuel.
