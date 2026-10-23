import {DECOR_SLOTS,DEFAULT_DECOR_PLACEMENTS,OWNABLE_DECOR_IDS} from '../../game/expansion';
import StorybookArt from './StorybookArt';
import {KingdomSprite} from '../kingdom/KingdomSprite';
const base=import.meta.env.BASE_URL+'assets/storybook/';
export const DECOR_ART={'garden-fountain':base+'fountain.webp','reading-lanterns':base+'lantern.webp'};
export function DecorationArt({id}){
 if(DECOR_ART[id])return <StorybookArt id={id==='garden-fountain'?'fountain':'lantern'} loading="lazy" decoding="async"/>;
 if(id==='word-garden'||id==='flower-border')return <KingdomSprite id="garden"/>;
 return <svg viewBox="0 0 100 115" aria-hidden="true"><path d="M20 110V14M80 110V14" stroke="#876742" strokeWidth="4"/>{id==='school-lanterns'?<g fill="#ffe6a0" stroke="#7d6338" strokeWidth="3"><path d="M12 15h16v22H12ZM72 15h16v22H72Z"/></g>:<g fill="#2f65a5" stroke="#edc66c" strokeWidth="2"><path d="M20 15h29v56L34 61l-14 10ZM51 15h29v56L65 61l-14 10Z"/></g>}</svg>;
}
export default function DecorationLayer({data}){
 return OWNABLE_DECOR_IDS.filter(id=>data.decorations[id]).map(id=>{const slot=DECOR_SLOTS[data.placements[id] || DEFAULT_DECOR_PLACEMENTS[id]];return <div key={id} className={`ks-decoration ks-decor-${id}`} data-decoration-id={id} data-slot={data.placements[id] || DEFAULT_DECOR_PLACEMENTS[id] || 'original'} aria-label={id.replaceAll('-',' ')} style={slot?{left:slot.x/1280*100+'%',top:slot.y/780*100+'%',width:slot.width/1280*100+'%',zIndex:slot.y}:undefined}><DecorationArt id={id}/></div>});
}
