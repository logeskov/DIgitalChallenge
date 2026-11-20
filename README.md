# Digitale Udfordringer

En browserbaseret samling af små spiludfordringer, der træner digitale færdigheder som talsystemer (binær, hex osv.). Spilleren skal ikke installere noget: det byggede spil er statiske filer, der kan lægges på fx GitHub Pages.

## Kom i gang (udvikling)

Kræver Node.js 18 eller nyere.

```sh
npm install
npm run dev      # starter udviklingsserver på http://localhost:5173
npm test         # kører tests
npm run build    # bygger det færdige spil til dist/
```

## Opbygning

| Sti | Indhold |
| --- | --- |
| `src/challenges/types.ts` | Det fælles interface, alle udfordringer følger |
| `src/challenges/index.ts` | Registret over udfordringer, som menuen viser |
| `src/challenges/<id>/index.ts` | Én mappe pr. udfordring |
| `src/core/progress.ts` | Point, niveauer og fremskridt, gemt i `localStorage` |
| `src/ui/` | Menu, niveauvalg, spilvisning og resultat (hash-routing: `#/udfordring/<id>/<niveau>`) |

## Sådan tilføjer du en udfordring

1. Opret `src/challenges/<id>/index.ts` og eksportér `challenge: Challenge`.
2. Tilføj den til arrayet i `src/challenges/index.ts`.

```ts
import type { Challenge } from '../types';

export const challenge: Challenge = {
  id: 'min-udfordring',
  title: 'Min udfordring',
  description: 'Kort beskrivelse til menuen.',
  category: 'Talsystemer',
  levels: 3,
  mount(el, ctx) {
    // ctx.level: valgt niveau (1-baseret)
    // ctx.addPoints(n): giv point undervejs
    // ctx.finish({ score, maxScore }): afslut runden
    // ctx.exit(): tilbage uden at afslutte
    // ctx.getBest(), ctx.storage.get/set: egne gemte data
    el.textContent = 'Hej!';
    return () => { el.innerHTML = ''; }; // oprydning
  },
};
```

Rammen gemmer bedste resultat pr. niveau og låser næste niveau op, når spilleren får mindst 80 % af `maxScore`.

**Point:** I den samlede pointsum tæller hvert niveau kun med pointene fra det seneste gennemførte forsøg (summen af `addPoints` i den runde). Prøver man igen og klarer sig dårligere, falder summen. En runde, man forlader før `finish`, tæller ikke, og de tidligere point står. Spillerens rang i topbjælken beregnes ud fra den samlede sum og kan derfor også falde.

`src/challenges/pladsholder/` er en lille eksempel-udfordring, der kan fjernes, når de rigtige er på plads.
