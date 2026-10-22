// Reviewable Appwrite Function entrypoint; never deployed automatically.
import { Client, Account, Databases, Query } from 'node-appwrite';
import { executeKingdomTransaction } from './kingdom-service.mjs';

export default async ({req,res}) => {
  const jwt=req.headers['x-appwrite-user-jwt'];
  if (!jwt) return res.json({error:'Sign in to your parent account first.'},401);
  const endpoint=process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project=process.env.APPWRITE_FUNCTION_PROJECT_ID;
  let user;
  try {user=await new Account(new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt)).get();}
  catch{return res.json({error:'Your sign-in could not be verified.'},401);}
  let body;
  try {body=req.bodyJson ?? JSON.parse(req.bodyText || '{}');}
  catch{return res.json({error:'Invalid request.'},400);}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.json({error:'Invalid request.'},400);
  if (Object.keys(body).some(k=>!['playerId','action'].includes(k))) return res.json({error:'Unexpected request fields.'},400);
  try {
    const admin=new Client().setEndpoint(endpoint).setProject(project).setKey(req.headers['x-appwrite-key']);
    const result=await executeKingdomTransaction({db:new Databases(admin),query:Query,databaseId:process.env.KINGDOM_DATABASE_ID || 'kingdom',actorId:user.$id,playerId:body.playerId,action:body.action});
    return res.json(result,200);
  } catch(error) {
    const code=error.status || error.code;
    if ([400,401,403].includes(code)) return res.json({error:error.message},code);
    if (code===409) return res.json({error:'Your kingdom changed in another window. Refresh before trying again.'},409);
    return res.json({error:'Your village could not be saved. Refresh before trying again.'},503);
  }
};
