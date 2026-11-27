# Forma

Kwartalne testy sprawności. Tablica i zapisy są dostępne dopiero po zalogowaniu administratora.

## Na swoim komputerze

```bash
git clone https://github.com/Bonzo7aab/forma.git
cd forma
npm install
npx convex dev
npm run dev
```

`npx convex dev` i `npm run dev` odpal w dwóch terminalach. Strona wstanie na adresie, który wypisze Next.js. Logowanie jest na `/logowanie`.

Przy pierwszym `npx convex dev` zaloguj się (`npx convex login`) i wskaż istniejący projekt Forma, jeśli chcesz zostać przy dotychczasowym koncie administratora i wynikach. Te dane są w Convex, nie w tym repozytorium.

Baza tylko na tym komputerze, bez chmury:

```bash
npx convex dev --configure new --project forma --dev-deployment local
```

To jest pusta baza. Formularz na stronie nie zakłada konta administratora.

Przykładowe dane (12 osób, 5 ćwiczeń, 6 kwartałów) wczytasz w panelu, zakładka Konto, albo poleceniem `npm run seed`.

## Vercel

1. Wdróż backend produkcyjny: `npx convex deploy`.
2. W projekcie Vercel ustaw `NEXT_PUBLIC_CONVEX_URL` na adres produkcyjnego deploymentu Convex.
3. Wdróż ten katalog jako aplikację Next.js.
4. Otwórz `/logowanie` i zaloguj się na konto administratora.
5. Jeśli chcesz dane przykładowe także na produkcji, uruchom `npx convex run seed:load --prod`.
