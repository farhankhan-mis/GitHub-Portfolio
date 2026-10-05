import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const catalogPath=path.join(root,'opportunities.json');
export const clean=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const canonicalKey=item=>item.canonical_key||[item.company,item.role,item.term,item.city,item.state].map(clean).join('|');
export async function readCatalog(){const value=JSON.parse(await fs.readFile(catalogPath,'utf8'));if(!Array.isArray(value))throw new Error('opportunities.json must be an array');return value}
export const isoDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
