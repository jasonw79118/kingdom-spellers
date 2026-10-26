import {Query} from 'appwrite';
// Read every persisted mastery record, not just the default first page.
export async function allDocuments(databases,databaseId,collectionId,queries=[]){
 const result=[];let cursor;
 for(;;){
  const page=await databases.listDocuments({databaseId,collectionId,queries:[...queries,Query.orderAsc('$id'),Query.limit(100),...(cursor?[Query.cursorAfter(cursor)]:[])]});
  result.push(...page.documents);
  if(page.documents.length<100)return result;
  cursor=page.documents.at(-1).$id;
 }
}
