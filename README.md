# Forma

Kwartalne testy sprawności. Tablica i zapisy są dostępne dopiero po zalogowaniu administratora.

Aplikacja na komputerze i ta w chmurze korzystają z tego samego wdrożenia Convex w chmurze (`scrupulous-orca-710`). Baza nie działa lokalnie.

## Na swoim komputerze

```bash
git clone https://github.com/Bonzo7aab/forma.git
cd forma
npm install
cp .env.example .env.local
npx convex login
npx convex dev
```

W drugim terminalu:

```bash
npm run dev
```

`npx convex dev` wysyła funkcje na istniejące wdrożenie w chmurze. Nie wybieraj lokalnej bazy. Konto administratora i wyniki są już na tym wdrożeniu. Logowanie jest na `/logowanie`.

Przykładowe dane (12 osób, 5 ćwiczeń, 6 kwartałów) wczytasz w panelu, zakładka Konto, albo poleceniem `npm run seed`.

## Vercel

1. Wdróż backend produkcyjny: `npx convex deploy`.
2. W projekcie Vercel ustaw `NEXT_PUBLIC_CONVEX_URL` na adres produkcyjnego deploymentu Convex.
3. Wdróż ten katalog jako aplikację Next.js.
4. Otwórz `/logowanie` i zaloguj się na konto administratora.
5. Jeśli chcesz dane przykładowe także na produkcji, uruchom `npx convex run seed:load --prod`.
