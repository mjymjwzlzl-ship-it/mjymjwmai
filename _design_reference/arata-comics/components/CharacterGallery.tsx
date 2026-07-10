import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GALLERY_CHARACTERS } from '../constants';
import { Lock, Unlock, ChevronLeft, Coins, Check } from 'lucide-react';

const CharacterGallery: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const character = GALLERY_CHARACTERS.find(c => c.id === id);
    
    // Mock purchase state
    const [purchasedBooks, setPurchasedBooks] = useState<string[]>(
        character?.photobooks.filter(b => b.isPurchased).map(b => b.id) || []
    );

    if (!character) {
        return <div className="p-10 text-center dark:text-white">캐릭터를 찾을 수 없습니다.</div>;
    }

    const handlePurchase = (bookId: string, price: number) => {
        const confirmBuy = window.confirm(`${price}코인을 사용하여 화보를 구매하시겠습니까?`);
        if (confirmBuy) {
            setPurchasedBooks([...purchasedBooks, bookId]);
            alert('구매가 완료되었습니다!');
        }
    };

    return (
        <div className="bg-white dark:bg-black min-h-screen text-gray-900 dark:text-gray-100 pb-10">
            {/* Header / Profile Area */}
            <div className="relative bg-gray-900 pb-10">
                <div className="absolute inset-0 overflow-hidden">
                    <img src={character.thumbnail} alt="bg" className="w-full h-full object-cover opacity-30 blur-xl scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-black"></div>
                </div>
                
                <div className="relative max-w-4xl mx-auto px-4 pt-6">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-300 hover:text-white mb-6">
                        <ChevronLeft size={20} /> 화보관으로 돌아가기
                    </button>

                    <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
                        {/* Profile Image */}
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white dark:border-arata-dark shadow-2xl flex-shrink-0">
                            <img src={character.thumbnail} alt={character.name} className="w-full h-full object-cover" />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 text-center md:text-left mb-2">
                            <div className="text-arata-green font-bold text-sm mb-1">{character.webtoonTitle}</div>
                            <h1 className="text-3xl md:text-5xl font-black mb-3">{character.name}</h1>
                            <p className="text-gray-600 dark:text-gray-400 max-w-md">{character.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Photobook List */}
            <div className="max-w-4xl mx-auto px-4 mt-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-arata-green">Available</span> Photobooks
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {character.photobooks.map((book) => {
                        const isUnlocked = purchasedBooks.includes(book.id);

                        return (
                            <div key={book.id} className="bg-white dark:bg-arata-dark border border-gray-200 dark:border-arata-gray rounded-xl overflow-hidden shadow-lg flex flex-col">
                                {/* Preview Image Container */}
                                <div className="relative aspect-video bg-gray-800 overflow-hidden group">
                                    <img 
                                        src={book.thumbnail} 
                                        alt={book.title} 
                                        className={`w-full h-full object-cover transition-all duration-500 ${isUnlocked ? 'group-hover:scale-105' : 'blur-md opacity-50 scale-110'}`} 
                                    />
                                    
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10">
                                            <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center mb-2">
                                                <Lock size={24} className="text-gray-300" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Locked Content</span>
                                        </div>
                                    )}

                                    {isUnlocked && (
                                        <div className="absolute top-2 right-2 bg-arata-green text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                                            <Check size={12} strokeWidth={3} /> 구매완료
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5 flex flex-col flex-grow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg leading-tight mb-1">{book.title}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{book.imageCount}장 수록</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-500 mb-4 flex-grow">{book.description}</p>
                                    
                                    {isUnlocked ? (
                                        <button className="w-full bg-gray-800 dark:bg-gray-700 text-white py-3 rounded-lg font-bold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                                            <Unlock size={18} /> 감상하기
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handlePurchase(book.id, book.price)}
                                            className="w-full bg-arata-green text-black py-3 rounded-lg font-bold hover:bg-green-400 transition-colors flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,220,100,0.3)] active:scale-95 transform duration-100"
                                        >
                                            <Coins size={18} /> {book.price}코인으로 잠금해제
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CharacterGallery;