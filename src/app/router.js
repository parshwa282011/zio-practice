// Minimal hash router (works on static hosting without server rewrites).
//   #/                    archive
//   #/paper/2021          practice (start screen, exam)
//   #/paper/2021/study    study mode
//   #/paper/2021/results  results of the latest finished attempt

const routes = [];

export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/gi, (_m, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ re, keys, handler });
}

export function currentPath() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function navigate(path) {
  if (currentPath() === path) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = path;
}

export function match(path) {
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) return { handler: r.handler, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function startRouter(onRoute) {
  const run = () => onRoute(match(currentPath()), currentPath());
  window.addEventListener('hashchange', run);
  run();
}
