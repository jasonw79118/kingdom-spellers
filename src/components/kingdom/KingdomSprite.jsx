import {useState} from 'react';
import {SPRITES} from './assetRegistry';
export function KingdomSprite({id,level=1,className='',registry=SPRITES}) {
  const key=id==='cottage' && level>=2 ? 'cottage-grand' : id;
  const art=registry[key];
  const [failed,setFailed]=useState(0);
  if (!art || failed>1) return <span className="ks-art-fallback" role="img" aria-label="Landmark artwork unavailable.">Saved landmark · artwork unavailable</span>;
  return <img className={className} src={failed ? art.fallback : art.src} alt="" draggable="false" decoding="async" loading="lazy" width={art.width} height={art.height} onError={()=>setFailed(n=>n+1)}/>;
}
