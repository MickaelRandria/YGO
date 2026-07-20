# YGO Referee — Midnight Arena

## Intention

Le duel est une scène sombre, tactique et réactive. La couleur ne remplit jamais
un écran : elle indique un joueur, une action ou un état. Les LP restent la
hiérarchie visuelle principale.

## Tokens

| Rôle | Valeur |
| --- | --- |
| Fond application | `#070707` |
| Surface 1 | `#111111` |
| Surface 2 | `#1B1B1B` |
| Surface 3 | `#252525` |
| Texte principal | `#F7F7F3` |
| Texte secondaire | `#A7A7A1` |
| Texte discret | `#6F6F6A` |
| Joueur 1 | `#FF9D2E` |
| Joueur 2 | `#39A7FF` |
| Danger | `#FF584D` |
| Gain | `#62D68B` |

## Règles de composition

- Le noir crée les niveaux de profondeur ; les surfaces diffèrent peu.
- J1 est orange feu et J2 bleu électrique. Ces couleurs servent aux halos,
  lignes de vie, bordures actives et retours d'action, jamais aux grands aplats.
- Les cartes d'action LP sont gris sombre, compactes, et conservent une cible
  tactile minimale de 44 px. Chaque rangée expose trois raccourcis (`100`,
  `500`, `1K`) sans défilement ; le bouton `±` couvre les autres montants.
- Les grandes zones (arène, sheet, modal et navigation) peuvent recevoir une
  ombre diffuse et un liseré interne. Les petits boutons n'en reçoivent pas.
- Les animations expriment un changement réel : LP, phase, victoire ou impact.
  Elles sont neutralisées par `prefers-reduced-motion`.

## Écran Duel

1. La phase est un carrousel central : phase courante blanche, voisines grisées,
   trait orange lumineux.
2. Le momentum est un axe orange/bleu avec repère `VS` et libellé d'avantage.
3. Les deux zones LP restent visibles et utilisables. Le joueur actif gagne un
   halo, une bordure et une ligne de vie plus lumineuse.
4. Le journal est un aperçu d'un événement. Son contenu complet reste dans la
   bottom sheet existante.
5. Les décors SVG originaux restent uniquement comme texture nocturne discrète.

## Écrans secondaires

- Setup : deux surfaces sombres avec liseré/halo joueur et aperçu de deck.
- Deck Builder et Lookup : champs sombres contrastés, résultats sur Surface 2.
- Règles : accordéons sombres, accent vert seulement sur l'élément ouvert.
- Navigation : flottante, compacte, icônes grisées ; l'onglet actif est blanc
  avec un trait orange, sans réduire les zones tactiles.

## Interdits

- Aucun personnage, carte illustrée ou identité visuelle Pokémon/Yu-Gi-Oh!
  ajouté comme décor.
- Pas de plein écran coloré, de dégradé crypto, ni de couleur utilisée comme
  unique moyen de comprendre l'état.
