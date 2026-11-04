import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {unstable_splitSqlQuery} from 'wrangler';
const root=resolve(import.meta.dirname,'..','drizzle');
const files=readdirSync(root).filter(name=>name.endsWith('.sql')).sort();
process.stdout.write(JSON.stringify(files.map(name=>({name,statements:unstable_splitSqlQuery(readFileSync(resolve(root,name),'utf8'))}))));
