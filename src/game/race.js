// Kingdom Pet Race — the rules.
//
// A race is practice with a scoreboard. The child spells words as usual and
// their pet is the thing being scored:
//
//   correct word   -> the pet is fed, which adds speed and pushes it forward
//   mistake        -> the pet stumbles, losing momentum and ground
//
// That is the whole design: there are no separate "race" mechanics to learn, so
// the reward for a good word is immediate and visible, and a mistake costs
// something that matters without ever being punitive.
//
// Races unlock after a set number of completed Royal Tests, so a child has to
// have demonstrated they can sit a real test before they get to race.

import { PETS } from "../components/kingdom/petArt";

// How many finished Royal Tests unlock the race.
export const RACE_UNLOCK_TESTS = 5;

// Track length, in "paces". A quick round is roughly 12-20 correct words.
export const TRACK_LENGTH = 220;

// Paces gained by a correct answer, before the pet's own speed is applied.
const PACE_PER_CORRECT = 11;
// Momentum lost to a mistake.
const STUMBLE_COST = 9;

export const MIN_MOMENTUM = 0.28;
export const MAX_MOMENTUM = 2.6;

export function raceUnlocked(testsCompleted = 0) {
  return testsCompleted >= RACE_UNLOCK_TESTS;
}

export function raceProgress(testsCompleted = 0) {
  return {
    done: Math.min(testsCompleted, RACE_UNLOCK_TESTS),
    need: RACE_UNLOCK_TESTS,
    locked: !raceUnlocked(testsCompleted),
  };
}

export function petById(id) {
  return PETS.find((p) => p.id === id) || PETS[0];
}

// Opponents pace themselves, so the field spreads out on its own rather than
// needing a difficulty setting. Each is just given a cruise speed.
export function makeRacers(playerPetId, opponentIds) {
  const ids = [playerPetId, ...opponentIds.filter((id) => id !== playerPetId)];
  return ids.slice(0, 5).map((id, i) => {
    const pet = petById(id);
    return {
      id,
      pet,
      isPlayer: i === 0,
      lane: i,
      distance: 0,
      // Player momentum starts level; opponents start at a gentle cruise.
      momentum: i === 0 ? 1 : 0.7 + i * 0.1,
      cruise: i === 0 ? 0 : 0.62 + i * 0.09,
      finished: false,
      finishTime: null,
    };
  });
}

/** A correct word: feed the pet, build momentum, move it up the track. */
export function feedCorrect(racer) {
  const gain = PACE_PER_CORRECT * racer.momentum * (racer.pet.speed / 3);
  return {
    ...racer,
    momentum: Math.min(MAX_MOMENTUM, racer.momentum + 0.22),
    distance: Math.min(TRACK_LENGTH, racer.distance + gain),
  };
}

/** A mistake: the pet stumbles and loses ground. Never goes below the floor. */
export function feedMistake(racer) {
  return {
    ...racer,
    momentum: Math.max(MIN_MOMENTUM, racer.momentum - 0.34),
    distance: Math.max(0, racer.distance - STUMBLE_COST),
  };
}

/** Opponents keep moving on their own between answers. */
export function advanceOpponents(racers) {
  return racers.map((r) => {
    if (r.isPlayer || r.finished) return r;
    const step = r.cruise * r.pet.speed * 2.1;
    const distance = r.distance + step;
    return {
      ...r,
      distance,
      finished: distance >= TRACK_LENGTH,
      finishTime: distance >= TRACK_LENGTH ? r.finishTime ?? 0 : null,
    };
  });
}

export function applyResult(racers, correct) {
  return advanceOpponents(
    racers.map((r) => (r.isPlayer && !r.finished ? (correct ? feedCorrect(r) : feedMistake(r)) : r))
  );
}

export function playerRacer(racers) {
  return racers.find((r) => r.isPlayer) || racers[0];
}

export function raceOver(racers) {
  return playerRacer(racers)?.finished === true;
}

/** Rank by who crossed the line; unfinished racers trail in distance order. */
export function raceResult(racers) {
  const ordered = [...racers].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished && b.finished) return (a.finishTime ?? 0) - (b.finishTime ?? 0);
    return b.distance - a.distance;
  });
  const player = playerRacer(racers);
  const place = ordered.findIndex((r) => r.isPlayer) + 1;
  return {
    place,
    total: racers.length,
    won: place === 1,
    podium: ordered.slice(0, 3).map((r) => r.id),
    playerPct: Math.min(100, Math.round(((player?.distance || 0) / TRACK_LENGTH) * 100)),
  };
}

export function placeLabel(place) {
  return { 1: "1st", 2: "2nd", 3: "3rd" }[place] || `${place}th`;
}

// How well the pet is doing, for the mood bubble above its head.
export function moodFor(racer) {
  if (racer.finished) return "🎉";
  if (racer.momentum >= 1.6) return "😃";
  if (racer.momentum >= 1) return "🙂";
  if (racer.momentum <= MIN_MOMENTUM + 0.05) return "😵";
  return "😕";
}
