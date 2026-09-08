import territoryGuides from '../data/territories/guides.json';
import { publicBuilds } from '../data/public-builds';
const pages=import.meta.glob('./**/*.{astro,md}');
const paths=Object.keys(pages).filter(p=>!p.includes('[')&&!p.endsWith('/404.astro')).map(p=>p.replace(/^\./,'').replace(/\.(astro|md)$/,'').replace(/\/index$/,'')+'/');
paths.push('/territories/start/','/territories/compare/','/territories/agents/',...Object.keys(territoryGuides).map(id=>`/territories/${id}/`));
paths.push(...publicBuilds.map(p=>`/projects/${p.id}/`),'/projects/territories/');
export function GET(){return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].sort().map(path=>`<url><loc>https://mejohnc.org${path}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});}
