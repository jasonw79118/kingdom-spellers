import {useState} from 'react';
import StorybookArt from './StorybookArt';
import {NPCS} from '../../game/npcs';
import './StorybookCharacters.css';
const base=import.meta.env.BASE_URL+'assets/storybook/';
export default function NpcCharacter({id,dialogue,action,onAction,compact=false,children}) {
 const npc=NPCS[id], [failed,setFailed]=useState(0);
 if(!npc)return null;
 return <aside className={`npc-character ${compact?'npc-compact':''}`} data-npc-id={id} aria-label={`${npc.name}, ${npc.role}`}>
  {failed<2?<img src={`${base}${id}.${failed?'png':'webp'}`} alt="" width="256" height="384" decoding="async" loading={id==='eli'?'eager':'lazy'} onError={()=>setFailed(n=>n+1)}/>:<span className="npc-art-missing">{npc.name}</span>}
  <div className="npc-dialogue"><span className="npc-role">{npc.location} · {npc.role}</span><h2>{npc.name}</h2><p>{dialogue || npc.dialogue}</p>{onAction&&<button type="button" className="btn btn-forest" onClick={onAction}>{action || npc.action}</button>}{children}</div>
 </aside>;
}
export function VillageGuides({onAction}) {
 const [id,setId]=useState('grace');
 return <section className="village-guides" aria-label="Village guides"><header><span className="gw-eyebrow">NEIGHBORS ON YOUR JOURNEY</span><h3>A friendly face for every adventure</h3><p>Meet your guides. Their advice is available while you build your village.</p></header><div className="npc-picker" role="group" aria-label="Choose a guide">{Object.values(NPCS).map(n=><button type="button" key={n.id} aria-pressed={id===n.id} onClick={()=>setId(n.id)}><StorybookArt id={n.id} width="64" height="80" loading="lazy"/><span>{n.name}</span></button>)}</div><NpcCharacter key={id} id={id} compact onAction={()=>onAction(id)}>{id==='bram'&&<button type="button" className="btn btn-ghost" onClick={()=>onAction('avatar')}>Customize your adventurer with a parent</button>}</NpcCharacter></section>;
}
