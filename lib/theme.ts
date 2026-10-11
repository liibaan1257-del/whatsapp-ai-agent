/**
 * Light / dark mode. The choice is kept in localStorage ("theme"); with no
 * choice the device setting decides. THEME_SCRIPT runs in <head> before the
 * page paints, so a dark page never flashes white.
 */
export const THEME_KEY = "theme";
export type Theme = "light" | "dark";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
