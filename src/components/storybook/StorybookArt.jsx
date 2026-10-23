import {useState} from 'react';
export default function StorybookArt({id,...props}){
 const [failed,setFailed]=useState(0);
 if(failed>1)return <span role="img" aria-label="Artwork unavailable"/>;
 return <img {...props} alt="" src={import.meta.env.BASE_URL+`assets/storybook/${id}.${failed?'png':'webp'}`} onError={()=>setFailed(n=>n+1)}/>;
}
