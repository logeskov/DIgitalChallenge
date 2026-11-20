export type Route =
  | { name: 'menu' }
  | { name: 'challenge'; id: string }
  | { name: 'play'; id: string; level: number };

/** Hash-baseret routing, så appen virker som statiske filer uden serveropsætning. */
export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'udfordring' && parts[1]) {
    const level = Number(parts[2]);
    if (parts[2] && Number.isInteger(level) && level >= 1) {
      return { name: 'play', id: parts[1], level };
    }
    return { name: 'challenge', id: parts[1] };
  }
  return { name: 'menu' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'menu':
      return '#/';
    case 'challenge':
      return `#/udfordring/${encodeURIComponent(route.id)}`;
    case 'play':
      return `#/udfordring/${encodeURIComponent(route.id)}/${route.level}`;
  }
}
