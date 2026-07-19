# YGO Referee

Poste d'arbitrage mobile-first pour duels Yu-Gi-Oh! physiques. Le scan est gratuit et open source : Flask, OpenCV, Tesseract et RapidFuzz — aucune clé API ni service de vision payant.

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
copy .env.example .env
npm install
npm run dev
```

Le frontend écoute sur `http://localhost:5173` et l'API locale sur `http://localhost:5000`.

Tesseract est aussi une dépendance système : installez le binaire `tesseract-ocr` et vérifiez qu'il est disponible dans le `PATH` avant de lancer le backend local. Render l'installe automatiquement via `backend/render-build.sh`.

Au premier lancement, le backend télécharge une seule fois les noms de cartes depuis YGOPRODeck dans `backend/cache/card_names.json`; il les réutilise pendant 30 jours.

## Limites du scan

La reconnaissance est la plus fiable avec des cartes à plat, bien éclairées, non sleevées et cadrées sans reflets. Tesseract est moins précis qu'une solution cloud IA sur les polices stylisées : les sleeves brillantes, angles prononcés, ombres, cartes abîmées et photos floues dégradent encore l'OCR. Une suggestion sous 70% est explicitement séparée dans l'interface et ne peut jamais être ajoutée sans confirmation manuelle. La recherche manuelle reste toujours disponible.

## Déploiement Vercel

Le fichier `vercel.json` déploie `frontend/` comme site statique. Vercel fournit HTTPS, ce qui permet l'installation de la PWA (manifest et service worker inclus).

Le scanner Flask/Tesseract ne peut **pas** s'exécuter dans le navigateur ni dans ce déploiement statique : il est prévu pour Render.

### Mise en ligne Render + Vercel

1. Dans Render, créez un **Blueprint** depuis ce dépôt : `render.yaml` crée le service Python gratuit et installe Tesseract au build.
2. Attendez l'URL Render, puis vérifiez `https://<service>.onrender.com/api/health`.
3. Dans Vercel, importez le dépôt puis définissez `VITE_API_URL=https://<service>.onrender.com` avant le déploiement.
4. Une fois l'URL Vercel connue, définissez `ALLOWED_ORIGIN=https://<projet>.vercel.app` dans Render et redéployez : c'est le seul paramètre requis pour verrouiller le CORS.
5. Testez le scan depuis le lien Vercel sur un téléphone.

Le plan gratuit Render met le service en veille après inactivité. Le premier scan suivant peut prendre 30 à 60 secondes ; l'application affiche alors un message de réveil. Il n'y a aucun secret à fournir pour l'OCR.
