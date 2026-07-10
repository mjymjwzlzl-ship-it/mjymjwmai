import React, { createContext, useContext, useState, useEffect } from 'react';

interface LikeContextType {
  likedWebtoons: string[];
  toggleLike: (id: string) => void;
  isLiked: (id: string) => boolean;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export const LikeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [likedWebtoons, setLikedWebtoons] = useState<string[]>(() => {
    const saved = localStorage.getItem('likedWebtoons');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('likedWebtoons', JSON.stringify(likedWebtoons));
  }, [likedWebtoons]);

  const toggleLike = (id: string) => {
    setLikedWebtoons(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isLiked = (id: string) => likedWebtoons.includes(id);

  return (
    <LikeContext.Provider value={{ likedWebtoons, toggleLike, isLiked }}>
      {children}
    </LikeContext.Provider>
  );
};

export const useLike = () => {
  const context = useContext(LikeContext);
  if (context === undefined) {
    throw new Error('useLike must be used within a LikeProvider');
  }
  return context;
};
