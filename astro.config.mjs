import { defineConfig } from 'astro/config';
import { generateTerritories } from './scripts/territories/generate.mjs';
generateTerritories();
import { optimizeOutput } from './scripts/optimize-output.mjs';
export default defineConfig({
  site: 'https://mejohnc.org',
  integrations: [{name:'optimize-static-output',hooks:{'astro:build:done':async ({dir})=>optimizeOutput(dir)}}],
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  redirects: {
    '/speaking': '/media/',
    '/stories/hardware-and-setups': '/years/',
    '/stories/safemark': '/years/2018/',
    '/stories/provisioning': '/years/2022/',
    '/stories/school-election': '/years/2016/',
    '/away/utah-denver': '/years/2019/',
    '/away/hawaii': '/years/2020/',
    '/away/nashville': '/years/2026/',
    '/work/service-delivery-automation': '/years/2026/',
    '/stories': '/years/',

    '/contact': '/about/',
    '/portfolio': '/work/',
    '/apps': '/products/',
    '/blog': '/media/',
    '/territories': '/projects/territories/',
    '/projects/business-os': '/products/',
  },
});
