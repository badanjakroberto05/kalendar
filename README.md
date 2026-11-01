# Kalendar instrukcija · kalendar.badxmedia.com

Privatna web aplikacija (PWA) za vođenje termina instrukcija. Sve radi na **tvom serveru**
(Hetzner + Coolify), bez vanjskih servisa i pretplata:

- **Jedna lozinka** za ulaz, sesija pamti prijavu 180 dana (nema ponovnog logiranja).
- **Tjedan / Mjesec / Učenici / Postavke** – prilagođeno mobitelu (iPhone) i desktopu.
- **Dodaj na početni zaslon** – radi kao prava aplikacija (standalone, ikona, splash).
- **Tjedni pregled nedjeljom navečer** (19:00, podesivo) za tjedan koji dolazi:
  - **push obavijest** na mobitel (Web Push, VAPID ključevi se generiraju sami – besplatno),
  - **email** preko tvog SMTP-a (npr. Gmail app lozinka) – opcionalno.
- **Podsjetnik prije termina** (push, npr. 60 min prije).
- **Ponavljanje svaki tjedan**, status *održano / otkazano*, cijena i mjesečni zbroj.
- **Obračun po učeniku**: za odabrani mjesec popis održanih termina (datum, vrijeme), ukupno sati i iznos za fakturu, oznaka „fakturirano” i kopiranje popisa.
- Baza je **SQLite datoteka** u `/data` – backup = kopiraj jednu datoteku.

## Tehnologija

| Dio | Što |
|---|---|
| Frontend | React 19 + Vite + Tailwind 4, PWA (service worker, manifest) |
| Backend | Node 24 (Express), `node:sqlite` (bez nativnih ovisnosti) |
| Obavijesti | `web-push` (VAPID) + `nodemailer` (SMTP) |
| Raspored | interni tajmer u serveru (Europe/Zagreb), bez crona i vanjskih servisa |

## Deploy na Coolify (Hetzner)

1. **Novi resurs → Public/Private Repository → `badanjakroberto05/kalendar`**, Build Pack: **Dockerfile**.
2. **Port:** `3000`.
3. **Domena:** `https://kalendar.badxmedia.com` (Coolify sam izda Let's Encrypt certifikat).
4. **Persistent Storage (volumen):** dodaj volume s putanjom u kontejneru **`/data`**
   (tu živi SQLite baza, VAPID ključevi i lozinka – bez toga se podaci gube pri redeployu).
5. **Environment variables** (vidi `.env.example`):
   - `APP_PASSWORD` – početna lozinka (obavezno, koristi se samo pri prvom pokretanju)
   - `APP_URL=https://kalendar.badxmedia.com`
   - `TZ_NAME=Europe/Zagreb`
   - za email (opcionalno): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `NOTIFY_EMAIL`
6. **DNS:** `kalendar.badxmedia.com` → **A zapis** na IP Hetzner servera (isti kao `badxmedia.com`).
7. Deploy. Provjera: `https://kalendar.badxmedia.com/api/health` → `{"ok":true}`.

### Gmail za email (besplatno)

Google račun → *Security* → uključi *2-Step Verification* → *App passwords* → napravi lozinku
(16 znakova) i upiši je u `SMTP_PASS`. `SMTP_USER` je puni Gmail. Limit je ~500 mailova dnevno,
nama treba 1 tjedno.

## Mama – prvi koraci na iPhoneu

1. Otvori `kalendar.badxmedia.com` u **Safariju**, upiši lozinku.
2. **Dijeli → Dodaj na početni zaslon**.
3. Otvori aplikaciju s početnog zaslona → **Postavke → Obavijesti na ovom uređaju → uključi**
   (iOS 16.4+ – push radi samo iz aplikacije na početnom zaslonu, ne iz Safarija).
4. **Postavke → „Pošalji mi pregled odmah (test)”** – stiže notifikacija (i email ako je podešen).

## Lokalni razvoj

```bash
npm install
APP_PASSWORD=test DATA_DIR=./data npm run dev:server   # API na :3000
npm run dev                                            # Vite na :5173 (proxy na /api)
```

Produkcijski build i pokretanje kao u Dockeru:

```bash
npm run build && APP_PASSWORD=test DATA_DIR=./data npm start
```

## Backup

Sve je u jednoj datoteci: `/data/kalendar.sqlite` (plus `-wal`/`-shm` dok server radi).
Kopiraj volumen ili s hosta: `docker cp <container>:/data/kalendar.sqlite ./backup.sqlite`.

## API (za znatiželjne)

`POST /api/login` · `GET /api/me` · `GET/POST/PUT/DELETE /api/lessons` · `GET/POST/PUT/DELETE /api/students` ·
`GET/PUT /api/settings` · `POST /api/push/subscribe|unsubscribe` · `POST /api/summary/send` · `PUT /api/password`
