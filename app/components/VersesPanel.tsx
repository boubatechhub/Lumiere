"use client";

import React from "react";
import { createVerseId, type Verse } from "@/types/video";

export function VersesPanel({
  verses,
  onChange,
}: {
  verses: Verse[];
  onChange: (verses: Verse[]) => void;
}) {
  function update(id: string, patch: Partial<Verse>) {
    onChange(verses.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function remove(id: string) {
    onChange(verses.filter((v) => v.id !== id));
  }

  function move(id: string, direction: -1 | 1) {
    const index = verses.findIndex((v) => v.id === id);
    const target = index + direction;
    if (target < 0 || target >= verses.length) return;
    const next = [...verses];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    onChange([...verses, { id: createVerseId(), text: "", translation: "", reference: "" }]);
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Versets</h2>
        <button
          onClick={add}
          className="text-sm rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5"
        >
          + Ajouter un verset
        </button>
      </div>

      <div className="space-y-3">
        {verses.map((verse, i) => (
          <div key={verse.id} className="rounded-lg border border-neutral-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Verset {i + 1}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => move(verse.id, -1)}
                  disabled={i === 0}
                  className="disabled:opacity-30 px-2 hover:text-neutral-200"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(verse.id, 1)}
                  disabled={i === verses.length - 1}
                  className="disabled:opacity-30 px-2 hover:text-neutral-200"
                >
                  ↓
                </button>
                <button onClick={() => remove(verse.id)} className="px-2 text-red-400 hover:text-red-300">
                  ✕
                </button>
              </div>
            </div>
            <textarea
              value={verse.text}
              onChange={(e) => update(verse.id, { text: e.target.value })}
              placeholder="Texte du verset"
              rows={2}
              className="w-full rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
            />
            <textarea
              value={verse.translation}
              onChange={(e) => update(verse.id, { translation: e.target.value })}
              placeholder="Traduction"
              rows={2}
              className="w-full rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                value={verse.reference ?? ""}
                onChange={(e) => update(verse.id, { reference: e.target.value })}
                placeholder="Référence (optionnel)"
                className="flex-1 rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
              />
              <input
                type="number"
                min={1}
                value={verse.durationSec ?? ""}
                onChange={(e) =>
                  update(verse.id, {
                    durationSec: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Durée (s, auto)"
                className="w-32 rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
              />
            </div>
          </div>
        ))}
        {verses.length === 0 && (
          <p className="text-sm text-neutral-500">Aucun verset. Cliquez sur « Ajouter un verset ».</p>
        )}
      </div>
    </section>
  );
}
