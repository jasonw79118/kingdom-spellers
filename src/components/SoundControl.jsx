import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {getSoundPreferences,setSoundPreferences,subscribeToSounds,syncSoundPreferences,unlockGameAudio,playGameSound,stopGameSounds} from '../lib/soundEffects';
import {stopSpeaking} from '../lib/speech';
import './SoundControl.css';
export default function SoundControl(){
 const [previewStatus,setPreviewStatus]=useState('');
 const [prefs,setPrefs]=useState(getSoundPreferences);const location=useLocation();
 useEffect(()=>subscribeToSounds(()=>setPrefs(getSoundPreferences())),[]);
 useEffect(()=>{
  const unlock=()=>unlockGameAudio();
  const storage=e=>{if(e.key==='ks2_game_sound'||e.key===null)syncSoundPreferences();};
  const hidden=()=>{if(document.hidden){stopSpeaking();stopGameSounds();try{if(navigator.audioSession)navigator.audioSession.type='auto';}catch{}}};
  for(const event of ['pointerdown','pointerup','touchend','click','keydown'])window.addEventListener(event,unlock,true);
  window.addEventListener('storage',storage);document.addEventListener('visibilitychange',hidden);
  return ()=>{for(const event of ['pointerdown','pointerup','touchend','click','keydown'])window.removeEventListener(event,unlock,true);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',hidden);stopSpeaking();stopGameSounds();};
 },[]);
 useEffect(()=>{stopSpeaking();stopGameSounds();},[location.key]);
 return <details className="game-sound-control"><summary aria-label="Game sound settings">{prefs.enabled&&prefs.volume>0?'Sounds on':'Sounds off'}</summary><div className="game-sound-panel"><strong>Game sounds</strong><button type="button" className="btn btn-sm" aria-pressed={prefs.enabled} onClick={()=>{setSoundPreferences({enabled:!prefs.enabled});unlockGameAudio();}}>{prefs.enabled?'Mute game sounds':'Turn game sounds on'}</button><label htmlFor="game-sound-volume">Effects volume · {Math.round(prefs.volume*100)}%</label><input id="game-sound-volume" type="range" min="0" max="100" step="5" value={Math.round(prefs.volume*100)} onChange={e=>setSoundPreferences({volume:Number(e.target.value)/100})}/><button type="button" className="btn btn-ghost btn-sm" disabled={!prefs.enabled||prefs.volume===0} onClick={async()=>{stopSpeaking();await unlockGameAudio();setPreviewStatus(playGameSound('money')?'Sound preview played.':'Audio is blocked. Tap Preview sound again and check your device volume.');}}>Preview sound</button><p role="status">{previewStatus}</p><p>Spoken words have their own controls and stay available when game sounds are muted.</p></div></details>;
}
