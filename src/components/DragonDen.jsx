import {useRef,useState} from 'react';
import {backend} from '../lib/backend';
import {dragonFeeds,dragonFood,dragonForm,DRAGON_FORMS,feedDragon,DRAGON_HUES} from '../game/dragon';
import {playGameSound} from '../lib/soundEffects';
import './DragonDen.css';
const asset=id=>import.meta.env.BASE_URL+'assets/dragons/'+id+'.webp';
export default function DragonDen({player,mastery,onSaved,onPractice}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),lock=useRef(false);
 const form=dragonForm(player.avatar),feeds=dragonFeeds(player.avatar),food=dragonFood(mastery,player.avatar),next=DRAGON_FORMS.find(f=>f.feeds>feeds);
 async function act(adopt=false){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
  try{
   // Re-read owner-scoped state before a cosmetic write; never save stale kingdom balances.
   const profiles=await backend.profiles.list();const current=profiles.find(p=>p.id===player.id);
   if(!current)throw new Error('Your player could not be loaded. Please try again.');
   const records=await backend.mastery.list(player.id);
   const avatar=adopt?{...current.avatar,companion:'dragon'}:feedDragon(current.avatar,records);
   const saved=await backend.profiles.update(player.id,{avatar});
   if(!saved)throw new Error('Your player could not be saved. Please try again.');
   onSaved(saved,records);
   const evolved=dragonForm(avatar).id!==dragonForm(current.avatar).id;
   setMessage(adopt?'Your baby dragon is ready to explore!':evolved?'Your dragon evolved into a '+dragonForm(avatar).name+'!':'Your dragon loved that snack!');
   playGameSound(evolved?'upgrade':'decorate');
  }catch(error){setMessage(error.message||'Could not save your dragon. Please try again.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className="dragon-den" aria-label="Dragon companion">
  <div className="dragon-portrait"><img src={asset(form.id)} alt={form.name+' companion'} width="240" height="240" style={{filter:`hue-rotate(${DRAGON_HUES[player.avatar?.companion]||0}deg)`}}/></div>
  <div className="dragon-care"><span className="gw-eyebrow">YOUR LITTLE LEGEND</span><h2>{player.avatar?.companion?form.name:'Meet your baby dragon'}</h2>
   <p>A little spelling, a little care, a lifelong friend. Earn one snack for every three correct spellings.</p>
   {player.avatar?.companion?<><div className="dragon-stats"><strong>{food} snacks ready</strong><span>{feeds} snacks fed</span></div>
    {next?<><label htmlFor="dragon-growth">{next.feeds-feeds} more snacks until {next.name}</label><progress id="dragon-growth" value={feeds} max={next.feeds}/></>:<p>Your guardian has fully grown. You can keep feeding your friend!</p>}
    <div className="ks-row-wrap"><button type="button" className="btn btn-gold" disabled={busy||food<1} onClick={()=>act()}>{busy?'Saving...':'Feed dragon'}</button><button type="button" className="btn btn-ghost" onClick={onPractice}>Earn snacks with spelling</button></div>
   </>:<button type="button" className="btn btn-gold" disabled={busy} onClick={()=>act(true)}>{busy?'Saving...':'Adopt baby dragon - free'}</button>}
   <p className="dragon-reassurance">Your dragon never loses growth or gets sick when you are away.</p><p role="status" className="dragon-message">{message}</p>
  </div><ol className="dragon-forms" aria-label="Dragon growth stages">{DRAGON_FORMS.map(f=><li key={f.id} aria-current={f.id===form.id?'step':undefined}><img src={asset(f.id)} alt="" width="75" height="75"/><strong>{f.name}</strong><span>{f.feeds} snacks</span></li>)}</ol>
 </section>;
}
