// New cloud actions use a real, explicitly configured Appwrite Function.
// Existing cloud purchase handlers remain available until that function is approved.
import { backend, backendMode } from './backend';
import { reduceKingdomAction } from '../game/expansion';
import { Client, Functions } from 'appwrite';

export const expansionActionsAvailable = backendMode === 'demo' || (backendMode === 'appwrite' && Boolean(import.meta.env.VITE_KINGDOM_FUNCTION_ID));

export async function performKingdomAction(playerId, action) {
  if (backendMode !== 'demo') {
    if (!expansionActionsAvailable) throw new Error('These new village improvements are not available yet. Your gold has not been spent.');
    const client = new Client().setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT).setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
    const execution = await new Functions(client).createExecution({functionId:import.meta.env.VITE_KINGDOM_FUNCTION_ID,body:JSON.stringify({playerId,action}),async:false});
    const response = JSON.parse(execution.responseBody || '{}');
    if (execution.responseStatusCode !== 200 || !response.profile || !response.progress) throw new Error(response.error || 'The village could not be saved. Refresh before trying again.');
    return response;
  }
  const me = await backend.auth.getCurrentUser();
  const run = () => {
    const profileRaw=localStorage.getItem('ks2_player_profiles');
    const progressRaw=localStorage.getItem('ks2_player_progress');
    const profiles=JSON.parse(profileRaw || '[]'), progresses=JSON.parse(progressRaw || '[]');
    const index=profiles.findIndex(p=>p.id===playerId), pi=progresses.findIndex(p=>p.player_id===playerId);
    if (pi<0) throw new Error('Refresh this kingdom before building.');
    const mastery=JSON.parse(localStorage.getItem('ks2_player_word_mastery') || '[]').filter(m=>m.player_id===playerId);
    const result=reduceKingdomAction({profile:profiles[index],progress:progresses[pi],mastery},action,me?.id);
    if (result.replay) return result;
    profiles[index]=result.profile;progresses[pi]=result.progress;
    // Synchronous same-turn commit with compensation; Web Locks serialize tabs.
    try {
      localStorage.setItem('ks2_player_profiles',JSON.stringify(profiles));
      localStorage.setItem('ks2_player_progress',JSON.stringify(progresses));
    } catch(error) {
      if (profileRaw!==null) localStorage.setItem('ks2_player_profiles',profileRaw);
      if (progressRaw!==null) localStorage.setItem('ks2_player_progress',progressRaw);
      throw error;
    }
    return result;
  };
  if (navigator.locks) return navigator.locks.request('ks2-kingdom-write',run);
  throw new Error('This browser cannot safely save village purchases. Try an updated browser.');
}
