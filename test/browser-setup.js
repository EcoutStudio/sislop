import {rmSync} from 'node:fs';
rmSync(new URL('../.wrangler/auth-test',import.meta.url),{recursive:true,force:true});
