export const THEME_STORAGE_KEY = "di-theme";

/**
 * Inline <head> script: applies the saved (or system) theme before first paint so the
 * page never flashes the wrong colours. Kept out of the "use client" module so the
 * server layout receives the plain string.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;
