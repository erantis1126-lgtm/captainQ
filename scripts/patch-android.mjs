// `npx cap add android`로 만든 프로젝트에 위치 권한을 넣는다.
// (WebView의 navigator.geolocation은 Capacitor가 런타임 권한 요청까지 처리한다.)
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'android/app/src/main/AndroidManifest.xml';
let xml = readFileSync(path, 'utf8');
const perms = ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']
  .filter(p => !xml.includes(`android.permission.${p}`))
  .map(p => `    <uses-permission android:name="android.permission.${p}" />`)
  .join('\n');
if (perms) xml = xml.replace('</manifest>', `${perms}\n</manifest>`);
if (!xml.includes('ACCESS_FINE_LOCATION')) throw new Error('위치 권한을 넣지 못했어요');
writeFileSync(path, xml);
console.log('AndroidManifest: 위치 권한 추가 완료');
