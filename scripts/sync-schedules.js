import puppeteer from 'puppeteer';
import * as fb from '../src/firebase.js';
import { TEAM_NAME_MAP } from '../src/data/defaultTeams.js';

const adminPassword = process.env.ADMIN_PASSWORD || '5566';
const forceUpdate = process.argv.includes('--force');

let isCancelled = false;
process.on('SIGINT', () => {
  console.log('\n[Scraper] 收到中斷訊號 (Ctrl+C)，準備停止...');
  isCancelled = true;
});

async function scrapeCpblSchedules() {
  console.log('[Scraper] 啟動瀏覽器...');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  
  console.log('[Scraper] 前往中職賽程頁面...');
  await page.goto('https://www.cpbl.com.tw/schedule', { waitUntil: 'networkidle2' });
  
  if (isCancelled) {
    await browser.close();
    return null;
  }

  console.log('[Scraper] 等待賽事資料載入...');
  try {
    await page.waitForSelector('.game_detail', { timeout: 10000 });
  } catch (e) {
    console.warn('[Scraper] 找不到 .game_detail，嘗試直接擷取');
  }

  const rawGames = await page.evaluate(() => {
    if (window.app && window.app.gameDatas) {
      return window.app.gameDatas;
    }
    return null;
  });

  await browser.close();

  if (isCancelled) return null;

  if (!rawGames) {
    throw new Error('Cannot find gameDatas in window.app');
  }

  console.log(`[Scraper] 成功取得 ${rawGames.length} 筆原始賽事資料`);

  const games = [];
  const cpblTeamMap = {
    'ACN': 'T1', 'ADD': 'T5', 'AJL': 'T3', 'AEO': 'T4', 'AAA': 'T2', 'AKK': 'T6'
  };

  const groupedGames = {};
  rawGames.forEach((g) => {
    const sno = g.GameSno;
    if (!groupedGames[sno]) groupedGames[sno] = [];
    groupedGames[sno].push(g);
  });

  Object.values(groupedGames).forEach((group) => {
    group.sort((a, b) => new Date(a.GameDate) - new Date(b.GameDate));
    const originalGame = group[0];
    const activeGame = group.find(g => g.PresentStatus === 1) || group[group.length - 1];
    const g = activeGame;
    
    try {
      const dateObj = new Date(g.GameDate);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][dateObj.getDay()];

      let time = '';
      if (g.GameDateTimeS) {
         const tDate = new Date(g.GameDateTimeS);
         const th = String(tDate.getHours()).padStart(2, '0');
         const tm = String(tDate.getMinutes()).padStart(2, '0');
         time = `${th}:${tm}`;
      }

      const vCode = (g.VisitingTeamCode || '').substring(0, 3);
      const hCode = (g.HomeTeamCode || '').substring(0, 3);
      
      let awayTeam = cpblTeamMap[vCode] || g.VisitingTeamName || '';
      let homeTeam = cpblTeamMap[hCode] || g.HomeTeamName || '';
      
      if (!awayTeam.startsWith('T')) awayTeam = TEAM_NAME_MAP[g.VisitingTeamName] || g.VisitingTeamName;
      if (!homeTeam.startsWith('T')) homeTeam = TEAM_NAME_MAP[g.HomeTeamName] || g.HomeTeamName;

      const gameId = `game_${y}_${g.GameSno}`;
      const validTeams = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
      const cheerPath = validTeams.includes(homeTeam) ? `/${dateStr}/${homeTeam}` : null;

      let isPostponed = false;
      let originalDateStr = null;
      let originalCheerPath = null;

      if (originalGame && originalGame.GameDate !== activeGame.GameDate) {
        isPostponed = true;
        const origD = new Date(originalGame.GameDate);
        const origY = origD.getFullYear();
        const origM = String(origD.getMonth() + 1).padStart(2, '0');
        const origDd = String(origD.getDate()).padStart(2, '0');
        originalDateStr = `${origY}-${origM}-${origDd}`;
        originalCheerPath = validTeams.includes(homeTeam) ? `/${originalDateStr}/${homeTeam}` : null;
      }

      games.push({
        gameId, date: dateStr, dayOfWeek, time, homeTeam, awayTeam,
        location: g.FieldAbbe || '', gameNumber: g.GameSno,
        cpblLink: `https://www.cpbl.com.tw/box?year=${y}&kindCode=${g.KindCode}&gameSno=${g.GameSno}`,
        cheerDetailPath: cheerPath, isPostponed, originalDate: originalDateStr,
        originalCheerPath, themeDay: null, status: g.GameResult === '0' ? 'normal' : 'finished',
      });
    } catch (err) {
      console.warn('解析賽事失敗', err);
    }
  });

  return games;
}

async function runScraper() {
  console.log('=== 開始執行賽程同步腳本 ===');
  try {
    console.log('1. 以管理員身分登入 Firebase...');
    await fb.loginAsAdmin(adminPassword);
    console.log('登入成功！');

    const lastSync = await fb.getLastSync();
    const now = Date.now();

    let shouldSyncSchedule = forceUpdate;
    if (!shouldSyncSchedule && lastSync?.schedule && (now - lastSync.schedule) < 24 * 60 * 60 * 1000) {
      console.log('賽程資料尚在 24 小時內，跳過同步。如需強制更新請加上 --force 參數');
      process.exit(0);
    }

    console.log('\n2. 開始同步賽程...');
    const games = await scrapeCpblSchedules();
    
    if (isCancelled) {
      console.log('\n⚠️ 已取消同步作業');
      process.exit(0);
    }

    if (games && games.length > 0) {
      const scheduleData = {};
      games.forEach((g) => { scheduleData[g.gameId] = g; });
      await fb.saveSchedules(scheduleData);
      await fb.setLastSync('schedule');
      console.log(`✅ 已更新 ${games.length} 場賽程`);
    }

    console.log('\n=== 同步腳本執行完畢 ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 執行失敗:', error);
    process.exit(1);
  }
}

runScraper();
