import { JSDOM } from 'jsdom';
import * as fb from '../src/firebase.js';
import {
  normalizeCheerleaderName,
  normalizeCheerleaderRecord,
} from './cheerleaderName.js';

const adminPassword = process.env.ADMIN_PASSWORD || '5566';
const forceUpdate = process.argv.includes('--force');

let isCancelled = false;
process.on('SIGINT', () => {
  console.log('\n[Scraper] 收到中斷訊號 (Ctrl+C)，準備停止...');
  isCancelled = true;
});

async function fetchCheerleaderPage(path) {
  try {
    const url = `https://lala.pythings.dev${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const memberCards = doc.querySelectorAll('h3.font-bold.text-gray-800');
    const members = [];

    memberCards.forEach((h3) => {
      const fullText = h3.textContent.trim();
      const nameMatch = fullText.match(/^(.+?)\s*\(/);
      const rawName = nameMatch ? nameMatch[1] : fullText;
      members.push(normalizeCheerleaderName(rawName));
    });
    return members;
  } catch (e) {
    console.warn(`無法取得啦啦隊班表 (${path}):`, e.message);
    return [];
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function normalizeExistingCheerleaders() {
  const cheerleaders = await fb.getAllCheerleaders();
  if (!cheerleaders) return 0;

  let updatedCount = 0;

  for (const [gameId, record] of Object.entries(cheerleaders)) {
    const normalizedRecord = normalizeCheerleaderRecord(record);
    if (JSON.stringify(normalizedRecord) === JSON.stringify(record)) continue;

    await fb.saveCheerleaders(gameId, normalizedRecord);
    updatedCount++;
  }

  return updatedCount;
}

async function runScraper() {
  console.log('=== 開始執行啦啦隊班表同步腳本 ===');
  try {
    console.log('1. 以管理員身分登入 Firebase...');
    await fb.loginAsAdmin(adminPassword);
    console.log('登入成功！');

    console.log('\n2. 正規化 Firebase 既有啦啦隊名字...');
    const normalizedCount = await normalizeExistingCheerleaders();
    console.log(`已更新 ${normalizedCount} 場既有班表`);

    const lastSync = await fb.getLastSync();
    const now = Date.now();

    let shouldSyncCheers = forceUpdate;
    if (!shouldSyncCheers && lastSync?.cheerleaders && (now - lastSync.cheerleaders) < 24 * 60 * 60 * 1000) {
      console.log('班表資料尚在 24 小時內，跳過同步。如需強制更新請加上 --force 參數');
      process.exit(0);
    }

    console.log('\n3. 讀取現有賽程資料...');
    const scheduleData = await fb.getSchedules();
    if (!scheduleData) {
      console.error('❌ 找不到賽程資料，請先執行 npm run sync-schedules');
      process.exit(1);
    }
      
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const upcomingGames = Object.values(scheduleData)
      .filter(g => (g.cheerDetailPath || g.originalCheerPath) && g.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`準備爬取 ${upcomingGames.length} 場未來賽事班表...`);
    let cheersUpdated = 0;

    for (let i = 0; i < upcomingGames.length; i++) {
      if (isCancelled) {
        console.log('\n⚠️ 已取消後續班表的抓取');
        break;
      }

      const game = upcomingGames[i];
      console.log(`[${i + 1}/${upcomingGames.length}] 正在抓取: ${game.date} (${game.homeTeam} 主場)`);
      
      let members = [];
      if (game.cheerDetailPath) {
        members = await fetchCheerleaderPage(game.cheerDetailPath);
      }

      if (members.length > 0) {
        await fb.saveCheerleaders(game.gameId, {
          homeMembers: members, awayMembers: [], fetchedDate: game.date
        });
        cheersUpdated++;
        console.log(`  └─ [成功] 更新班表: ${members.join(', ')}`);
      } else if (game.isPostponed && game.originalCheerPath) {
        const originalMembers = await fetchCheerleaderPage(game.originalCheerPath);
        if (originalMembers.length > 0) {
          await fb.saveCheerleaders(game.gameId, {
            homeMembers: originalMembers, awayMembers: [], fetchedDate: game.originalDate, isFallback: true
          });
          cheersUpdated++;
          console.log(`  └─ [Fallback成功] 更新原訂日期班表`);
        } else {
          console.log(`  └─ [無資料] 尚無班表`);
        }
      } else {
        console.log(`  └─ [無資料] 尚無班表`);
      }
      
      if (!isCancelled && i < upcomingGames.length - 1) {
        await delay(500); // polite delay
      }
    }
    
    if (!isCancelled || cheersUpdated > 0) {
       await fb.setLastSync('cheerleaders');
       console.log(`\n✅ 本次執行共更新 ${cheersUpdated} 場啦啦隊班表`);
    }

    console.log('\n=== 同步腳本執行完畢 ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 執行失敗:', error);
    process.exit(1);
  }
}

runScraper();
