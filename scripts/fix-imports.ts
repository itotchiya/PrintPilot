import * as fs from 'fs';
import * as path from 'path';

const files = [
  'src/app/api/admin/config/[category]/route.ts',
  'src/app/api/admin/config/[category]/[id]/route.ts',
  'src/app/api/admin/config/binding/[id]/tiers/route.ts',
  'src/app/api/admin/config/binding/[id]/offset-tiers/route.ts',
  'src/app/api/admin/config/carriers/[id]/dept-rates/route.ts',
  'src/app/api/admin/config/carriers/[id]/rates/route.ts',
  'src/app/api/admin/config/lamination/[id]/tiers/route.ts',
  'src/app/api/admin/config/paper/[id]/grammages/route.ts',
];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/markFournisseurConfigCustomized/g, 'markSupplierConfigCustomized');
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${file}`);
  } else {
    console.log(`Not found: ${file}`);
  }
}

console.log('Done!');
