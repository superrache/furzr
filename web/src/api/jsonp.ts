import { ServiceError } from "./types";

let counter = 0;

/**
 * Requête JSONP minimale (Deezer ne renvoie pas d'en-têtes CORS).
 * Le paramètre `callback` est ajouté à l'URL.
 */
export function jsonp<T>(url: string, timeoutMs = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const callbackName = `__furzr_jsonp_${Date.now().toString(36)}_${counter++}`;
    const script = document.createElement("script");
    const registry = window as unknown as Record<string, unknown>;

    const cleanup = () => {
      clearTimeout(timer);
      delete registry[callbackName];
      script.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new ServiceError(`JSONP timeout: ${url}`));
    }, timeoutMs);

    registry[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new ServiceError(`JSONP error: ${url}`));
    };
    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + callbackName;
    document.head.appendChild(script);
  });
}
