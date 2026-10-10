// Holds the JWT for API calls. sessionStorage is used so the token is cleared when the tab closes.
// Every access is wrapped because storage can be blocked or unavailable.
const KEY = 'hustlehub.token';
let memoryToken = null;

export function getToken() {
  try {
    return window.sessionStorage.getItem(KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setToken(token) {
  memoryToken = token || null;
  try {
    if (token) window.sessionStorage.setItem(KEY, token);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the in-memory copy is enough for this session */
  }
}

export function clearToken() {
  setToken(null);
}
