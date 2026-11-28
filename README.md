# Forma

Kwartalne testy sprawności. Odwiedzający wybierają grupę i wpisują jej hasło, żeby zobaczyć postęp osób z tej grupy. Zapisywać dane może tylko administrator.

## Lokalnie

```bash
npm install
npx convex dev
npm run dev
```

Przy pierwszym wejściu na `/logowanie` zakładasz jedyne konto administratora. Potem rejestracja jest zamknięta.

Przykładowe dane (12 osób, 5 ćwiczeń, 6 kwartałów) wczytasz w panelu, zakładka Konto, albo poleceniem `npm run seed`. Grupy przykładowe — U14, U16, U18 i Senior — mają hasło `przyklad`.

## Vercel

1. Wdróż backend produkcyjny: `npx convex deploy`.
2. W projekcie Vercel ustaw `NEXT_PUBLIC_CONVEX_URL` na adres produkcyjnego deploymentu Convex.
3. Wdróż ten katalog jako aplikację Next.js.
4. Otwórz `/logowanie` i utwórz konto administratora.
5. Jeśli chcesz dane przykładowe także na produkcji, uruchom `npx convex run seed:load --prod`. Grupy przykładowe mają hasło `przyklad`.
