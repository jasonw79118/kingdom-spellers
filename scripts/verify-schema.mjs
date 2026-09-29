// Verify the Appwrite schema: tables, columns and indexes.
import { readFileSync } from "node:fs";
import { Client, TablesDB } from "node-appwrite";

const ENV = {};
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) ENV[m[1]] = m[2].trim();
}
const db = new TablesDB(
  new Client().setEndpoint(ENV.APPWRITE_ENDPOINT).setProject(ENV.APPWRITE_PROJECT_ID).setKey(ENV.APPWRITE_API_KEY)
);

const { tables } = await db.listTables("kingdom");
console.log("tables:", tables.length, "\n");

let totalIndexes = 0;
for (const t of tables.sort((a, b) => a.$id.localeCompare(b.$id))) {
  const { columns } = await db.listColumns("kingdom", t.$id);
  const { indexes } = await db.listIndexes("kingdom", t.$id);
  totalIndexes += indexes.length;
  console.log(
    t.$id.padEnd(24),
    String(columns.length).padStart(2) + " cols",
    String(indexes.length).padStart(2) + " idx",
    indexes.length ? " [" + indexes.map((i) => i.key).join(", ") + "]" : ""
  );
}
console.log("\ntotal indexes:", totalIndexes);
