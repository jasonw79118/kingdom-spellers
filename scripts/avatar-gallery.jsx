import React from 'react';
import {createRoot} from 'react-dom/client';
import Avatar from '../src/components/Avatar';
import {DEFAULT_AVATAR,AVATAR_OPTIONS} from '../src/game/avatar';
export function gallery(){
 const host=document.createElement('div');host.id='avatar-gallery';document.querySelector('main').style.display='none';document.body.appendChild(host);const root=createRoot(host);
 const rows=[...['boy','girl'].flatMap(base=>AVATAR_OPTIONS.hairs.map(h=>({label:base+' / '+h.label,config:{...DEFAULT_AVATAR,base,hair:h.id,skin:'#e0ac7e',tunic:'#4a7c59',cape:'blue'}}))),...AVATAR_OPTIONS.skins.map(s=>({label:s.label,config:{...DEFAULT_AVATAR,base:'girl',skin:s.id,hair:'long',hairColor:'#8a5a2e',tunic:'#6b5b9e',crown:'royal'}}))];
 root.render(<section style={{padding:24,background:'#eee4c7'}}><h1 style={{fontFamily:'Georgia'}}>Painted wardrobe · actual avatar renderer</h1><div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:16}}>{rows.map(row=><article key={row.label} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:10,background:'#fff8e8',border:'1px solid #c6b47a',borderRadius:12}}><Avatar config={row.config} size={180} presentation="full"/><strong style={{fontSize:12}}>{row.label}</strong><Avatar config={row.config} size={72}/></article>)}</div></section>);
}
