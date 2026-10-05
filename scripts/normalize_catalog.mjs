import fs from 'node:fs/promises';
import {catalogPath,canonicalKey,readCatalog} from './catalog_core.mjs';
const today=process.env.CATALOG_TODAY||new Date().toISOString().slice(0,10),records=await readCatalog();
for(const item of records){item.canonical_key=canonicalKey(item);const expired=item.deadline&&item.deadline<today,stale=!item.last_verified||Math.floor((new Date(`${today}T12:00:00Z`)-new Date(`${item.last_verified}T12:00:00Z`))/86400000)>14;if(expired)item.listing_status='Closed';else if(item.listing_status==='Verify'||stale)item.listing_status='Needs re-verification';item.is_active=item.listing_status==='Active'}
records.sort((a,b)=>String(a.company).localeCompare(String(b.company))||String(a.role).localeCompare(String(b.role)));await fs.writeFile(catalogPath,`${JSON.stringify(records,null,2)}\n`);console.log(`Normalized ${records.length} public records for ${today}.`);
