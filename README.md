# YGO Referee

Poste d'arbitrage mobile-first pour duels Yu-Gi-Oh! physiques. Le scan est 100% local et gratuit : Flask, OpenCV, EasyOCR et RapidFuzz — aucune clé API ni service de vision payant.

## Démarrage

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
npm install
npm run dev
```

Le frontend écoute sur `http://localhost:5173` et l'API locale sur `http://localhost:5000`.

Au premier lancement, le backend télécharge une seule fois les noms de cartes depuis YGOPRODeck dans `backend/cache/card_names.json`; il les réutilise pendant 30 jours.

## Limites du scan

La reconnaissance est la plus fiable avec des cartes à plat, bien éclairées, non sleevées et cadrées sans reflets. Les sleeves brillantes, angles prononcés, ombres, cartes abîmées et photos floues dégradent l'OCR. Une suggestion sous 70% est explicitement séparée dans l'interface et ne peut jamais être ajoutée sans confirmation manuelle.

## Déploiement Vercel

Le fichier `vercel.json` déploie `frontend/` comme site statique. Vercel fournit HTTPS, ce qui permet l'installation de la PWA (manifest et service worker inclus).

Le scanner Flask/EasyOCR ne peut **pas** s'exécuter dans le navigateur ni dans ce déploiement statique. Pour conserver le scan en production, déployez `backend/` sur un hôte Python compatible puis définissez la variable Vercel `VITE_SCAN_API_URL` sur l'URL publique correspondante, par exemple `https://api.example.com/api/scan`. Sans cette variable, la PWA utilise `http://localhost:5000/api/scan`, adapté uniquement au développement local.
