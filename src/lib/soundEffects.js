// Original, quiet Web Audio cues. No files, downloads, microphone or service.
const KEY='ks2_game_sound';
const listeners=new Set();
let context=null,master=null,active=[],speechActive=false,permission=false,lastCue=0;
let preferences={enabled:true,volume:.4};
export function readSoundPreferences(){
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return {enabled:saved.enabled!==false,volume:Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.4};}catch{return {...preferences};}
}
preferences=readSoundPreferences();
export function getSoundPreferences(){return {...preferences};}
export function subscribeToSounds(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
export function stopGameSounds(){for(const node of active){try{node.stop();}catch{}}active=[];}
export function setSoundPreferences(patch){
 preferences={enabled:typeof patch.enabled==='boolean'?patch.enabled:preferences.enabled,volume:Number.isFinite(patch.volume)?Math.max(0,Math.min(1,patch.volume)):preferences.volume};
 if(!preferences.enabled||preferences.volume===0)stopGameSounds();
 if(master&&context)master.gain.setValueAtTime(preferences.volume*.32,context.currentTime);
 try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch{/* Session preferences still work in private/quota modes. */}
 listeners.forEach(listener=>listener());return getSoundPreferences();
}
export function syncSoundPreferences(){const next=readSoundPreferences();setSoundPreferences(next);}
export function setSpeechActive(activeNow){speechActive=Boolean(activeNow);if(speechActive)stopGameSounds();}

// [start seconds, frequency Hz, duration seconds, relative gain, waveform].
// Softer downward notes invite a retry; money uses a short, separate bell tail.
export const SOUND_CUES={
 correct:[[0,523,.13,.7],[.09,659,.15,.65],[.18,784,.23,.6]],
 wrong:[[0,330,.16,.45,'sine'],[.14,294,.24,.35,'sine']],
 money:[[0,1319,.1,.32],[.09,1568,.17,.25]],
 clear:[[0,110,.07,.7,'triangle'],[.1,147,.07,.6,'triangle'],[.22,196,.16,.4]],
 build:[[0,196,.07,.6,'triangle'],[.11,196,.07,.55,'triangle'],[.24,392,.12,.55],[.35,523,.22,.45]],
 upgrade:[[0,392,.12,.55],[.1,523,.12,.5],[.2,659,.12,.5],[.3,784,.26,.45]],
 quest:[[0,523,.14,.5],[.12,659,.14,.5],[.24,784,.16,.45],[.4,1047,.3,.4]],
 mastery:[[0,659,.12,.5],[.11,784,.12,.5],[.22,988,.15,.45],[.36,1319,.28,.35]],
 rank:[[0,392,.18,.55,'triangle'],[.16,523,.18,.5,'triangle'],[.32,659,.2,.45],[.5,784,.36,.4]],
 region:[[0,262,.15,.5],[.13,392,.15,.5],[.26,523,.17,.45],[.42,784,.3,.4]],
 decorate:[[0,659,.12,.45],[.12,880,.2,.35]],
 place:[[0,440,.08,.35],[.07,523,.13,.3]],
};
export function notesForSound(event,{coins=false,mastered=false}={}){
 const source=SOUND_CUES[mastered&&event==='correct'?'mastery':event];
 if(!source)return [];
 const notes=source.map(n=>[...n]);
 if(coins&&event==='correct')notes.push(...SOUND_CUES.money.map(([time,...rest])=>[time+.55,...rest]));
 return notes;
}
// Separate synthesis from policy so real PCM output can be checked offline.
export function scheduleSound(audio,output,event,options={},start=audio.currentTime){
 const sources=[];
 for(const [delay,frequency,duration,level,wave='sine'] of notesForSound(event,options)){
  const oscillator=audio.createOscillator(),envelope=audio.createGain();
  oscillator.type=wave;oscillator.frequency.setValueAtTime(frequency,start+delay);
  envelope.gain.setValueAtTime(0,start+delay);
  envelope.gain.linearRampToValueAtTime(level,start+delay+.008);
  envelope.gain.exponentialRampToValueAtTime(.0001,start+delay+duration);
  oscillator.connect(envelope);envelope.connect(output);
  oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};
  oscillator.start(start+delay);oscillator.stop(start+delay+duration+.015);sources.push(oscillator);
 }
 return sources;
}
export function unlockGameAudio(){
 permission=true;
 if(!preferences.enabled||typeof window==='undefined')return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  if(!context){context=new Audio();master=context.createGain();master.gain.value=preferences.volume*.32;master.connect(context.destination);}
  if(context.state==='suspended')context.resume().catch(()=>{});
 }catch{/* Effects are optional; learning remains usable without audio support. */}
}
export function playGameSound(event,options={}){
 if(!SOUND_CUES[event]||!permission||!preferences.enabled||preferences.volume===0||speechActive||typeof document==='undefined'||document.hidden)return false;
 if(!context||context.state!=='running')return false; // No late/autoplay surprise after a blocked gesture.
 const now=performance.now();if(now-lastCue<65)return false;
 stopGameSounds();lastCue=now;
 try{active=scheduleSound(context,master,event,options,context.currentTime+.005);return active.length>0;}catch{stopGameSounds();return false;}
}
