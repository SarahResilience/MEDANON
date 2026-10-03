// FICTIONAL DEMONSTRATION DATA — ENTIRELY MADE-UP
// This file contains a purely fictional gynecology consultation report used
// during live demonstrations for physicians. No real patient information.
// All names, dates, IDs and addresses below are invented for testing.

export const DEMO_TEXT = `Cabinet de Gynécologie Dr. Élise Berger
Rue du Bugnon 21, 1005 Lausanne · Suisse
Tél: +41 21 555 47 82 · Email: cabinet.berger@example.ch

COMPTE-RENDU DE CONSULTATION
Consultation du: 14.03.2024

Patiente: Sophie Martin
Née le: 14.03.1987
Adresse: Avenue de Cour 42, 1007 Lausanne
Téléphone: +41 79 123 45 67
Email: sophie.martin@example.ch
N° patient: 4839201
N° AVS: 756.1234.5678.90
Assurance: Helsana, N° police: 887654321

Médecin traitant: Dr. Marc Dupont, Cabinet Central Lausanne

MOTIF DE CONSULTATION
Contrôle gynécologique annuel. La patiente rapporte des cycles réguliers, sans dysménorrhée notable. Pas de saignements inter-menstruels. Contraception: DIU au cuivre en place depuis 2021.

ANTÉCÉDENTS
- G1P1: accouchement voie basse en 2019, sans complication.
- Pas d'antécédent chirurgical gynécologique.
- Antécédents familiaux: mère avec cancer du sein diagnostiqué à 62 ans.

EXAMEN CLINIQUE
Poids: 63 kg · Taille: 168 cm · TA: 118/72 mmHg
Examen des seins: pas de masse palpable, pas d'écoulement mamelonnaire.
Examen gynécologique: col d'aspect normal, utérus antéversé de taille normale, annexes libres et indolores.
Frottis cervico-vaginal effectué ce jour.

EXAMENS COMPLÉMENTAIRES
Échographie pelvienne: utérus 78 x 42 x 55 mm, endomètre fin (5 mm), ovaires d'aspect normal, DIU en place et bien positionné.
Résultat de laboratoire du 05.03.2024 (Laboratoire Unilabs Lausanne, Accession: LAB-2024-88213):
- Hémoglobine: 13.2 g/dL
- Ferritine: 42 µg/L
- TSH: 1.8 mUI/L

ÉVALUATION
Consultation gynécologique de contrôle sans anomalie. DIU au cuivre efficace et bien toléré. Vigilance familiale pour dépistage sénologique.

PLAN
- Poursuite du DIU jusqu'en 2026.
- Mammographie de dépistage à 40 ans (année 2027).
- Frottis: résultat attendu sous 10 jours, envoi par courrier.
- Prochain contrôle: 14.03.2025.

Signé électroniquement,
Dr. Élise Berger
Spécialiste FMH en Gynécologie-Obstétrique
`;

// Pre-computed word positions on a virtual page (letter-size @ 96dpi ~= 816x1056).
// We'll render the text onto a canvas and use canvas measurements at runtime.
export const DEMO_META = {
  filename: 'demo_compte_rendu_gynecologie.pdf',
  language: 'fra',
  fictional: true,
  pageWidth: 816,
  pageHeight: 1056,
};
