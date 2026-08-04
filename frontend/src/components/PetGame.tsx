import React, { useState, useEffect } from "react";
import { X, Trophy, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";

const EMOJIS = ["🍎", "🥕", "🍗", "🍓", "🥩", "🥦", "🍉", "🦴"];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function PetGame({ onClose, onWin }: { onClose: () => void, onWin: (score: number) => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    const deck = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({ id: idx, emoji, isFlipped: false, isMatched: false }));
    setCards(deck);
    setFlippedIds([]);
    setMoves(0);
    setWon(false);
  };

  const handleCardClick = (id: number) => {
    if (flippedIds.length === 2 || won) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    setCards(cards.map(c => c.id === id ? { ...c, isFlipped: true } : c));

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [id1, id2] = newFlipped;
      const c1 = cards.find(c => c.id === id1);
      const c2 = cards.find(c => c.id === id2); // Note: card state before this click, so c2 is actually `card`

      if (c1?.emoji === card.emoji) {
        // Match
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === id1 || c.id === id2 ? { ...c, isMatched: true } : c
          ));
          setFlippedIds([]);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === id1 || c.id === id2 ? { ...c, isFlipped: false } : c
          ));
          setFlippedIds([]);
        }, 1000);
      }
    }
  };

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      setWon(true);
      const score = Math.max(10, 50 - moves);
      setTimeout(() => onWin(score), 1500);
    }
  }, [cards, moves, onWin]);

  const modal = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
        <div className="bg-purple-500 p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-black flex items-center gap-2">🎮 Pet Memory Match</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <span className="font-bold text-slate-500">Moves: {moves}</span>
            <button onClick={startNewGame} className="text-purple-600 font-bold flex items-center gap-1 hover:text-purple-700">
              <RotateCcw size={16} /> Restart
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {cards.map(c => (
              <div 
                key={c.id}
                onClick={() => handleCardClick(c.id)}
                className={`aspect-square rounded-2xl cursor-pointer text-4xl flex items-center justify-center transition-all duration-300 transform perspective-1000 ${c.isFlipped || c.isMatched ? 'bg-purple-100 rotate-y-180 shadow-inner' : 'bg-purple-500 hover:bg-purple-600 shadow-md shadow-purple-200 hover:-translate-y-1'}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className={`transition-opacity duration-300 ${c.isFlipped || c.isMatched ? 'opacity-100' : 'opacity-0'}`}>
                  {c.emoji}
                </div>
              </div>
            ))}
          </div>

          {won && (
            <div className="mt-6 text-center animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full mb-2 shadow-lg shadow-yellow-100 animate-float-bob">
                <Trophy size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800">You Won!</h3>
              <p className="text-slate-500 font-bold">Great job feeding your pet!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
