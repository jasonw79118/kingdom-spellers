// All positions are local to the shared 240 x 320 avatar art stage.
const base=import.meta.env.BASE_URL+'assets/avatars/painted-v1/';
export const avatarAsset=id=>({src:base+id+'.webp',fallback:base+id+'.png'});
export const BODY={
 boy:{x:64,y:24,w:112,h:280,skin:'M82 24H159V86Q166 98 135 103L131 112H109L107 103Q75 96 82 24Z',coat:'M91 99 109 94 120 111 132 94 151 100 165 143 151 151 139 124 141 145H100L101 124 88 151 74 143Z M101 153H114L110 191 88 185Z M127 153H140L153 185 132 191Z'},
 girl:{x:66,y:24,w:108,h:280,skin:'M82 24H158V86Q164 99 134 104L130 115H110L108 104Q77 97 82 24Z',coat:'M93 101 108 96 120 117 132 96 149 101 162 154 150 158 139 125 140 145H101L101 126 88 158 77 154Z M100 154H115L110 195 89 188Z M127 154H140L153 188 131 195Z'},
};
export const HAIR={short:{x:79,y:15,w:83,h:68},long:{x:69,y:14,w:104,h:116},curly:{x:66,y:8,w:108,h:116},ponytail:{x:77,y:13,w:103,h:110},bun:{x:81,y:1,w:78,h:89}};
