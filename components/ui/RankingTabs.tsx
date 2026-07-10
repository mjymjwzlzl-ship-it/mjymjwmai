"use client";
import React from 'react';

type Props = {
  items: string[];
  value: string;
  onChange: (v: string) => void;
};

export default function RankingTabs({ items, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      {items.map((it) => {
        const active = it === value;
        return (
          <button
            key={it}
            onClick={() => onChange(it)}
            className={
              active
                ? 'rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10'
            }
          >
            {it}
          </button>
        );
      })}
    </div>
  );
}


