// Appwrite client configuration.
//
// Set these to switch the app from demo mode to Appwrite:
//   VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
//   VITE_APPWRITE_PROJECT_ID=6abacd6a001d4161641f
//
// When either is missing the app runs in demo mode (localStorage), so it
// always works with zero configuration.

import { Client, Account, Databases, Storage, ID } from "appwrite";

export const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
export const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

export const isAppwriteConfigured = Boolean(endpoint && projectId);

// Database / collection identifiers
export const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID || "kingdom";
export const COLLECTIONS = {
  profiles: "profiles",
  playerProfiles: "player_profiles",
  spellingLists: "spelling_lists",
  spellingWords: "spelling_words",
  dictionaryWords: "dictionary_words",
  wordAttempts: "word_attempts",
  mastery: "player_word_mastery",
  progress: "player_progress",
  achievements: "achievements",
  playerAchievements: "player_achievements",
  inventory: "inventory",
  playerInventory: "player_inventory",
};

let client = null;
let account = null;
let databases = null;

function getClient() {
  if (!client && isAppwriteConfigured) {
    client = new Client().setEndpoint(endpoint).setProject(projectId);
  }
  return client;
}

export function getAccount() {
  if (!account) {
    const c = getClient();
    if (c) account = new Account(c);
  }
  return account;
}

export function getDatabases() {
  if (!databases) {
    const c = getClient();
    if (c) databases = new Databases(c);
  }
  return databases;
}

export { ID, Permission, Role, Query } from "appwrite";
