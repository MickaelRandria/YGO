# YGO Referee

PWA mobile-first pour arbitrer des duels Yu-Gi-Oh! physiques. Le scan est 100 % local et gratuit : Flask, OpenCV, PaddleOCR (PP-OCRv5) et RapidFuzz, sans clé API ni service cloud.

## Démarrage local

Dans un premier terminal :

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Dans un second terminal :

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Le frontend écoute sur `http://localhost:5173` et l'API locale sur `http://localhost:5000`.

PaddleOCR et PaddlePaddle sont installés par `pip` : aucun binaire système, clé API ou service cloud n'est nécessaire. Au premier démarrage, PaddleOCR télécharge ses modèles PP-OCRv5 dans le cache local ; cela peut prendre une à deux minutes. Les démarrages suivants sont plus rapides.

## Limites du scan

PaddleOCR est plus lourd à installer qu'un OCR léger, mais plus adapté aux noms imprimés sur fonds colorés ou illustrés. La reconnaissance reste la plus fiable avec des cartes à plat, bien éclairées, non sleevées et sans reflets. Les sleeves brillantes, les ombres, les angles prononcés, les cartes abîmées et les photos floues dégradent l'OCR.

Une suggestion sous 70 % est séparée dans l'interface et ne peut jamais être ajoutée sans confirmation. La recherche manuelle reste toujours disponible.

## Données de cartes en français

L'OCR, le cache local de noms et les recherches YGOPRODeck utilisent le français (`language=fr`). Les visuels de cartes fournis par YGOPRODeck restent en anglais : ils sont communs à toutes les langues, ce n'est pas un bug. Les noms et textes de cartes renvoyés par l'API restent, eux, en français.

Une carte très récente peut ne pas encore avoir de traduction française. Dans ce cas, la recherche réessaie automatiquement avec les données par défaut de YGOPRODeck afin de ne jamais bloquer l'ajout ou la recherche manuelle.

## Référentiel de noms français

Le fuzzy matching combine deux sources : la collection Excel personnelle (prioritaire, car son orthographe est vérifiée sur les cartes physiques) et YGOPRODeck en français, qui couvre les cartes absentes de la collection. L'Excel ne sert qu'à identifier le nom ; les détails de la carte restent résolus par YGOPRODeck.

Pour régénérer le cache après une mise à jour de la collection :

```powershell
python backend/scripts/extract_excel_names.py "C:\chemin\vers\Collection.xlsx"
```

Le fichier Excel source et les caches sont ignorés par Git car ils sont personnels. Une personne qui clone le projet peut fournir son propre fichier ou utiliser uniquement le filet de sécurité YGOPRODeck.

## PWA et déploiement

`vercel.json` déploie le frontend comme PWA statique sur Vercel. Le scanner Flask/PaddleOCR ne peut pas s'exécuter dans le navigateur ni sur cette partie statique : il est prévu pour tourner localement sur votre PC pour le moment.

PaddleOCR demande davantage de mémoire que Tesseract. Si le scanner doit un jour être hébergé, il faudra prévoir une machine suffisamment dimensionnée ; les offres gratuites à faible RAM ne sont pas un objectif du backend actuel.

## Tester sur un téléphone en Wi-Fi local

1. Trouvez l'adresse IPv4 Wi-Fi du PC : `ipconfig` sous Windows, `hostname -I` sous Linux, ou les détails Wi-Fi sous macOS.
2. Vérifiez que le téléphone est sur le même réseau Wi-Fi (pas en 4G/5G).
3. Dans `frontend/.env`, remplacez `localhost` par l'adresse du PC :

   ```env
   VITE_API_URL=http://192.168.1.42:5000
   ```

4. Lancez `python app.py` dans `backend`, puis `npm run dev` dans `frontend`.
5. Ouvrez `http://192.168.1.42:5173` sur le téléphone, avec votre vraie adresse IP.

Si la page ne charge pas, autorisez Python et Node.js sur les réseaux privés dans le pare-feu du PC. `localhost:5173` continue de fonctionner normalement sur le PC.

## Diagnostiquer un scan

Ouvrez temporairement `http://<IP-DU-PC>:5173/?debugScan=true`, relancez le scan, puis ouvrez `http://<IP-DU-PC>:5000/api/debug/last`. La page montre l'original, les contours, les recadrages, les variantes envoyées à PaddleOCR, leurs textes et leurs scores de confiance natifs. Les fichiers sont enregistrés localement dans `backend/debug_output/` et ignorés par Git.
