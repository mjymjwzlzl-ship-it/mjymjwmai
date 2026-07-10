import React, { createContext, useContext, useEffect, useState } from 'react';

type AppContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  isAdult: boolean;
  toggleAdult: () => void;
};

const AppContext = createContext<AppContextType>({
  isDarkMode: true,
  toggleTheme: () => {},
  isAdult: false,
  toggleAdult: () => {},
});

export const useTheme = () => useContext(AppContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Adult Mode State
  const [isAdult, setIsAdult] = useState(() => {
     const saved = localStorage.getItem('isAdult');
     // Default to false (Safe Mode) if not set, or true if that's the preferred default. 
     // Given the adult nature of the mock data, let's default to false so the user has to toggle it on, 
     // OR default to true since the mock data is mostly adult.
     // Let's default to false (Safe) to demonstrate the change cleanly.
     return saved ? saved === 'true' : false; 
  });
  
  const toggleAdult = () => {
      const newState = !isAdult;
      setIsAdult(newState);
      localStorage.setItem('isAdult', String(newState));
  }

  return (
    <AppContext.Provider value={{ isDarkMode, toggleTheme, isAdult, toggleAdult }}>
      {children}
    </AppContext.Provider>
  );
};