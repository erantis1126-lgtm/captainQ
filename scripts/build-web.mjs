// 웹 파일(GitHub Pages에 올라가는 것과 같은 파일)을 앱용 www/ 폴더로 복사한다.
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';

const files = ['index.html', 'privacy.html', 'assets/icon-512.png', 'assets/apple-touch-icon.png'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www/assets', { recursive: true });
for (const f of files) copyFileSync(f, `www/${f}`);
console.log('www/ ready:', files.join(', '));
