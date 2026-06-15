import { TEAM_NAME_MAP } from '../data/defaultTeams.js';

const PROXY_BASE = 'https://api.allorigins.win/raw?url=';
const LALA_BASE = 'https://lala.pythings.dev';

/**
 * 透過 Vite Proxy 抓取中職官網賽程
 */
export async function fetchSchedulePage() {
  try {
    const year = 2026;
    
    // 1. 呼叫 Vite 本地端的 Puppeteer 爬蟲 API
    const apiRes = await fetch('/api/cpbl/scrape');
    const result = await apiRes.json();
    
    if (!result.success) {
      throw new Error(`CPBL API 回傳失敗: ${result.error}`);
    }

    const rawGames = result.data;
    const games = [];

    // CPBL 的球隊代碼對應
    const cpblTeamMap = {
      'ACN': 'T1', // 中信兄弟
      'ADD': 'T5', // 統一獅
      'AJL': 'T3', // 樂天桃猿
      'AEO': 'T4', // 富邦悍將
      'AAA': 'T2', // 味全龍 (推測)
      'AKK': 'T6'  // 台鋼雄鷹 (推測)
    };

    // 依照 GameSno 進行分組，處理延賽狀況
    const groupedGames = {};
    rawGames.forEach((g) => {
      const sno = g.GameSno;
      if (!groupedGames[sno]) groupedGames[sno] = [];
      groupedGames[sno].push(g);
    });

    Object.values(groupedGames).forEach((group) => {
      // 按照 GameDate 排序
      group.sort((a, b) => new Date(a.GameDate) - new Date(b.GameDate));
      
      // 取出原始日期(第一筆)與當前有效場次(PresentStatus === 1 或最後一筆)
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

        // 時間
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
        
        // 味全跟台鋼的代碼可能要再確認，我們直接根據隊名補救
        if (!awayTeam.startsWith('T')) awayTeam = TEAM_NAME_MAP[g.VisitingTeamName] || g.VisitingTeamName;
        if (!homeTeam.startsWith('T')) homeTeam = TEAM_NAME_MAP[g.HomeTeamName] || g.HomeTeamName;

        const gameId = `game_${y}_${g.GameSno}`;

        const validTeams = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
        const cheerPath = validTeams.includes(homeTeam) ? `/${dateStr}/${homeTeam}` : null;

        // 判斷是否為延賽，並取得原始日期資訊
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
          gameId,
          date: dateStr,
          dayOfWeek,
          time,
          homeTeam,
          awayTeam,
          location: g.FieldAbbe || '',
          gameNumber: g.GameSno,
          cpblLink: `https://www.cpbl.com.tw/box?year=${y}&kindCode=${g.KindCode}&gameSno=${g.GameSno}`,
          cheerDetailPath: cheerPath,
          isPostponed,
          originalDate: originalDateStr,
          originalCheerPath,
          themeDay: null,
          status: g.GameResult === '0' ? 'normal' : 'finished',
        });
      } catch (err) {
        console.warn('解析賽事失敗', err);
      }
    });

    return games;
  } catch (e) {
    console.warn('無法取得賽程資料:', e);
    return [];
  }
}

/**
 * 抓取特定場次的啦啦隊名單
 */
export async function fetchCheerleaderPage(path) {
  try {
    const url = `/api/lala${path}`;
    const res = await fetch(url);
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const memberCards = doc.querySelectorAll('h3.font-bold.text-gray-800');
    const members = [];

    memberCards.forEach((h3) => {
      const fullText = h3.textContent.trim();
      // Format: "李多慧 (#82)" — extract name only
      const nameMatch = fullText.match(/^(.+?)\s*\(/);
      if (nameMatch) {
        members.push(nameMatch[1].trim());
      } else {
        members.push(fullText);
      }
    });

    return members;
  } catch (e) {
    console.warn(`無法取得啦啦隊班表 (${path}):`, e);
    return [];
  }
}

/**
 * 爬取賽程寫入 Firebase
 */
export async function syncSchedules(forceUpdate, firebase) {
  let gamesUpdated = 0;

  try {
    if (!forceUpdate) {
      const lastSync = await firebase.getLastSync();
      const now = Date.now();
      if (lastSync?.schedule && (now - lastSync.schedule) < 24 * 60 * 60 * 1000) {
        console.log('賽程資料尚在 24 小時內，跳過同步');
        return { gamesUpdated: 0 };
      }
    }

    console.log('正在抓取賽程資料...');
    const games = await fetchSchedulePage();

    if (games.length > 0) {
      const scheduleObj = {};
      games.forEach((g) => {
        scheduleObj[g.gameId] = g;
      });

      await firebase.saveSchedules(scheduleObj);
      await firebase.setLastSync('schedule');
      gamesUpdated = games.length;
      console.log(`已更新 ${gamesUpdated} 場賽程`);
    } else {
      throw new Error('未取得任何賽程資料，終止同步以保護資料庫');
    }
  } catch (e) {
    console.error('賽程同步失敗:', e);
    throw e;
  }

  return { gamesUpdated };
}

/**
 * 根據目前的賽程爬取班表寫入 Firebase
 */
export async function syncCheerleaders(forceUpdate, firebase, options = {}) {
  let cheersUpdated = 0;
  const { onProgress, checkCancelled } = options;

  try {
    if (!forceUpdate) {
      const lastSync = await firebase.getLastSync();
      const now = Date.now();
      if (lastSync?.cheerleaders && (now - lastSync.cheerleaders) < 24 * 60 * 60 * 1000) {
        console.log('班表資料尚在 24 小時內，跳過同步');
        return { cheersUpdated: 0 };
      }
    }

    // 從 Firebase 獲取現有的賽程
    console.log('讀取現有賽程以抓取班表...');
    const schedules = await firebase.getSchedules();
    if (!schedules) {
      throw new Error('找不到賽程資料，請先更新賽程');
    }
    
    // 取得今天的日期字串 (YYYY-MM-DD)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 過濾出今天及未來的賽程，並且有 cheerDetailPath
    const games = Object.values(schedules)
      .filter(g => (g.cheerDetailPath || g.originalCheerPath) && g.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date)); // 確保照時間順序爬

    console.log(`過濾後剩下 ${games.length} 場未來賽事準備爬取...`);
    
    let currentIndex = 0;
    for (const game of games) {
      if (checkCancelled && checkCancelled()) {
        console.log('使用者手動中斷班表爬取程序');
        break;
      }

      currentIndex++;
      if (onProgress) {
        onProgress({
          current: currentIndex,
          total: games.length,
          currentGame: game,
          statusMessage: `正在抓取：${game.date}`
        });
      }

      try {
        let members = [];
        if (game.cheerDetailPath) {
          members = await fetchCheerleaderPage(game.cheerDetailPath);
        }

        if (members.length > 0) {
          await firebase.saveCheerleaders(game.gameId, {
            homeMembers: members,
            awayMembers: [], // Only populated for 南人季 etc.
            fetchedDate: game.date
          });
          cheersUpdated++;
        } else if (game.isPostponed && game.originalCheerPath) {
          // 若無新班表且為延賽，嘗試抓取原始日期的班表
          const originalMembers = await fetchCheerleaderPage(game.originalCheerPath);
          if (originalMembers.length > 0) {
            await firebase.saveCheerleaders(game.gameId, {
              homeMembers: originalMembers,
              awayMembers: [],
              fetchedDate: game.originalDate,
              isFallback: true
            });
            cheersUpdated++;
          }
        }

        // Polite delay between requests
        await delay(500);
      } catch (e) {
        console.warn(`班表抓取失敗 (${game.gameId}):`, e);
      }
    }

    await firebase.setLastSync('cheerleaders');
    console.log(`已更新 ${cheersUpdated} 場班表`);

  } catch (e) {
    console.error('啦啦隊班表同步失敗:', e);
    throw e;
  }

  return { cheersUpdated };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
