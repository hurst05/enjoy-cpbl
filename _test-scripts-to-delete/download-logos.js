import fs from 'fs';
import path from 'path';

async function fetchLogos() {
  const res = await fetch('https://www.cpbl.com.tw');
  const html = await res.text();
  
  const logoDir = path.join(process.cwd(), 'public', 'logos');
  if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

  const regex = /<a href="\/team\?ClubNo=([A-Z]+)".*?background-image:url\('([^']+)'\)/g;
  let match;
  const logos = {};

  while ((match = regex.exec(html)) !== null) {
    const code = match[1];
    if (logos[code]) continue; // Skip if we already found the first (small) logo for this team
    
    let imgUrl = match[2];
    if (imgUrl.startsWith('/')) imgUrl = 'https://www.cpbl.com.tw' + imgUrl;
    
    logos[code] = imgUrl;
    
    console.log(`Found small logo for ${code}: ${imgUrl}`);
    
    // Download it
    const imgRes = await fetch(imgUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(path.join(logoDir, `${code}.png`), buffer);
    console.log(`Saved ${code}.png`);
  }
  
  console.log('Done mapping:', logos);
}

fetchLogos().catch(console.error);
