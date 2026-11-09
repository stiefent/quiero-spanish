"use client";

import { useSyncExternalStore } from "react";

/**
 * Learner progress. Stored in localStorage for version 1; the shape maps
 * one-to-one onto a Supabase `progress` row per user (see supabase/schema.sql).
 *
 * Each item lives in a Leitner box (0–5). A correct recall moves it up a box
 * and pushes its next review further out; a miss drops it to box 0. Items in
 * low boxes are the "weak words" the Review screen pulls from.
 */
export interface ItemState {
  box: number;
  due: number; // epoch ms
  seen: number;
  misses: number;
}

export interface Progress {
  xp: number;
  streak: number;
  lastDay: string | null; // YYYY-MM-DD local
  items: Record<string, ItemState>;
  units: Record<string, { completed: number; best: number }>;
}

const KEY = "aprende.progress.v1";
const INTERVALS_H = [0, 4, 24, 72, 168, 504]; // hours until next review per box

const empty: Progress = { xp: 0, streak: 0, lastDay: null, items: {}, units: {} };

let state: Progress = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: run in memory */
  }
}

function save(next: Progress) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function today(d = new Date()) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => empty,
  );
}

export function recordAnswer(itemId: string, correct: boolean) {
  load();
  const prev = state.items[itemId] ?? { box: 0, due: 0, seen: 0, misses: 0 };
  const box = correct ? Math.min(prev.box + 1, 5) : 0;
  const item: ItemState = {
    box,
    due: Date.now() + INTERVALS_H[box] * 3600_000,
    seen: prev.seen + 1,
    misses: prev.misses + (correct ? 0 : 1),
  };
  save({ ...state, xp: state.xp + (correct ? 10 : 1), items: { ...state.items, [itemId]: item } });
}

export function completeLesson(unitId: string, score: number) {
  load();
  const t = today();
  let streak = state.streak;
  if (state.lastDay !== t) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    streak = state.lastDay === today(y) ? streak + 1 : 1;
  }
  const u = state.units[unitId] ?? { completed: 0, best: 0 };
  save({
    ...state,
    xp: state.xp + 20,
    streak,
    lastDay: t,
    units: { ...state.units, [unitId]: { completed: u.completed + 1, best: Math.max(u.best, score) } },
  });
}

export function resetProgress() {
  save(empty);
}

/** 0–1 strength of a unit: average Leitner box of its items. */
export function unitStrength(p: Progress, itemIds: string[]): number {
  if (!itemIds.length) return 0;
  const sum = itemIds.reduce((s, id) => s + (p.items[id]?.box ?? 0), 0);
  return sum / (itemIds.length * 5);
}

/** Streak still alive today or yesterday? */
export function liveStreak(p: Progress): number {
  if (!p.lastDay) return 0;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return p.lastDay === today() || p.lastDay === today(y) ? p.streak : 0;
}
