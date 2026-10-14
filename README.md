# Reusable Auth

Express és Passport alapú auth modul, PostgreSQL-adapterrel,
React demóval és háttérben futó e-mail-küldéssel.

## Funkciók

- Regisztráció és belépés felhasználónévvel vagy e-maillel
- Sessionkezelés, kijelentkezés és session-visszavonás
- E-mail-megerősítés, jelszóbeállítás és visszaállítás
- Jelszómódosítási értesítések
- Opcionális Google- és Facebook-belépés, fiók-összekapcsolás
- Fióktörlés
- CSRF-védelem és IP-alapú próbálkozáskorlátozás
- Titkosított, PostgreSQL-ben tárolt e-mail-várólista

## Követelmények

- Node.js 24
- npm
- PostgreSQL
- SMTP-hozzáférés a tényleges levélküldéshez

## Felépítés

- `server/auth`: újrahasználható backendcsomag
- `server/db`: PostgreSQL-adapter és adatbázisséma
- `server/email`: SMTP-küldő és worker
- `client`: React demóalkalmazás

## Telepítés

A projekt gyökeréből:

```bash
cd server/auth
npm install
npm pack
```

A backend mappájában:

```bash
cd ..
npm install ./auth/pakaimark-auth-0.1.0.tgz
cp .env.example .env
```

Az archívum neve a csomag aktuális verziójától függ.
Az `app.js` a csomagot így importálja:

```js
const createAuth = require("@pakaimark/auth");
```

Töltsd ki a `.env` fájlt.
Két külön véletlen kulcsot generálj a SESSION_SECRET és
EMAIL_QUEUE_KEY változókhoz:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

A külső szolgáltatók kikapcsolhatók az app.js-ben:

```js
google: null,
facebook: null,
```

## Adatbázis

Új telepítéskor psql-ben:

```sql
CREATE DATABASE auth_dev;
\c auth_dev
\i /absolute/path/to/auth/server/db/schema.sql
```

A teljes schema.sql csak üres adatbázishoz való.
Ne futtasd utána ismét a sémába már beépített migrációkat.
Meglévő adatbázist a még nem alkalmazott migrációkkal frissíts.

## Indítás

Külön terminálokban, a server mappájából:

```bash
node app.js
```

```bash
node email/worker.js
```

A client mappájából:

```bash
npm install
npm run dev
```

A felület címe: http://localhost:5173

A worker nélkül a levelek a várólistában maradnak.
A localhost linkeket azon a gépen nyisd meg, ahol a demó fut.

## Használat másik backendben

Telepítsd a generált .tgz csomagot, majd add át az adaptereket:

```js
const createAuth = require("@pakaimark/auth");

const auth = createAuth({
  users,
  sessions,
  accounts,
  frontendUrl: "http://localhost:5173",
  google: null,
  facebook: null,
});
```

Az express-session bekötése után ez a sorrend szükséges:

```js
app.use(auth.sessionGuard);
app.use(auth.initialize);
app.use(auth.session);
app.use("/api/auth", auth.router);
```

Védett útvonalhoz:

```js
app.get("/private", auth.requireAuth, handler);
```

## Fontos korlátok

- A demó fejlesztési konfiguráció; az éles HTTPS/proxy beállítás külön szükséges.
- A próbálkozáskorlátozó számlálói jelenleg memóriában vannak.
- A Facebook-regisztráció megosztott e-mail-címet igényel.
- Külső szolgáltató kikapcsolása előtt biztosíts más belépési módot
  az azt használó fiókoknak.
- SMTP-hibák és workerleállás esetén ismételt levél előfordulhat.
- Ez tanulási projekt, nem függetlenül auditált biztonsági termék.

A .env, titkos kulcsok és session-cookie-k nem kerülhetnek Gitbe.
