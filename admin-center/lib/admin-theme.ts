export type AdminTheme = 'light' | 'dark';
export const ADMIN_THEME_KEY = 'arata-admin-theme';

// Hydrate with the saved palette before the first paint; keep light as the default.
export const ADMIN_THEME_BOOTSTRAP = `(function(){var theme='light';try{var saved=localStorage.getItem('arata-admin-theme');if(saved==='dark'||saved==='light')theme=saved;}catch(e){}var root=document.documentElement;root.dataset.adminTheme=theme;root.classList.toggle('dark',theme==='dark');})();`;
