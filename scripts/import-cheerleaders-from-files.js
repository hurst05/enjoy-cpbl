import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as fb from '../src/firebase.js';

const directory = path.resolve('doc/exportCheerSchedule');
const dryRun = process.argv.includes('--dry-run');
const adminPassword = process.env.ADMIN_PASSWORD || '5566';
const filenamePattern = /^(\d{4}-\d{2}-\d{2})_(T[1-6])\.json$/;

function isValidDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateFile(filename, data) {
  const match = filename.match(filenamePattern);
  if (!match) throw new Error('檔名必須是 {YYYY-MM-DD}_{T1-T6}.json');

  const [, filenameDate, filenameTeam] = match;
  if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('JSON 根節點必須是物件');
  if (!isValidDate(data.date)) throw new Error('date 必須是有效的 YYYY-MM-DD');
  if (!/^T[1-6]$/.test(data.homeTeam)) throw new Error('homeTeam 必須是 T1 到 T6');
  if (data.date !== filenameDate || data.homeTeam !== filenameTeam) throw new Error('檔名與 JSON 的 date/homeTeam 不一致');
  if (!Array.isArray(data.homeMembers) || data.homeMembers.length === 0) throw new Error('homeMembers 不可為空');
  if (data.homeMembers.some(member => typeof member !== 'string' || !member.trim())) {
    throw new Error('homeMembers 必須全部是非空字串');
  }

  return {
    date: data.date,
    homeTeam: data.homeTeam,
    homeMembers: data.homeMembers.map(member => member.trim()),
  };
}

function findGame(schedules, { date, homeTeam }) {
  const games = Object.entries(schedules).map(([key, game]) => ({
    ...game,
    gameId: game.gameId || key,
  }));
  const currentMatches = games.filter(game => game.date === date && game.homeTeam === homeTeam);

  if (currentMatches.length > 1) throw new Error('找到多場相同日期與主場球隊的賽事');
  if (currentMatches.length === 1) return { game: currentMatches[0], isFallback: false };

  const originalMatches = games.filter(game => (
    game.isPostponed && game.originalDate === date && game.homeTeam === homeTeam
  ));
  if (originalMatches.length > 1) throw new Error('找到多場相同原訂日期與主場球隊的延賽賽事');
  if (originalMatches.length === 1) return { game: originalMatches[0], isFallback: true };

  throw new Error('找不到對應賽事');
}

async function run() {
  console.log(`=== 從 JSON ${dryRun ? '檢查' : '匯入'}啦啦隊班表 ===`);

  const filenames = (await readdir(directory))
    .filter(filename => filename.toLowerCase().endsWith('.json'))
    .sort();
  if (filenames.length === 0) throw new Error(`目錄內沒有 JSON：${directory}`);

  const schedules = await fb.getSchedules();
  if (!schedules) throw new Error('Firebase 中沒有賽程資料，請先同步賽程');

  const pending = [];
  const failures = [];

  for (const filename of filenames) {
    try {
      const data = JSON.parse(await readFile(path.join(directory, filename), 'utf8'));
      const schedule = validateFile(filename, data);
      const { game, isFallback } = findGame(schedules, schedule);
      pending.push({ filename, game, schedule, isFallback });
      console.log(`✓ ${filename} -> ${game.gameId}${isFallback ? '（原訂日期）' : ''}`);
    } catch (error) {
      failures.push({ filename, reason: error.message });
      console.warn(`✗ ${filename}: ${error.message}`);
    }
  }

  let imported = 0;
  if (!dryRun && pending.length > 0) {
    await fb.loginAsAdmin(adminPassword);

    for (const item of pending) {
      try {
        const cheerleaders = {
          homeMembers: item.schedule.homeMembers,
          awayMembers: [],
          fetchedDate: item.schedule.date,
        };
        if (item.isFallback) cheerleaders.isFallback = true;

        await fb.saveCheerleaders(item.game.gameId, cheerleaders);
        imported++;
      } catch (error) {
        failures.push({ filename: item.filename, reason: `Firebase 寫入失敗：${error.message}` });
      }
    }

    if (imported > 0) await fb.setLastSync('cheerleaders');
  }

  console.log(`\n${dryRun ? '可匯入' : '已匯入'}：${dryRun ? pending.length : imported} 個檔案`);
  if (failures.length > 0) {
    console.error(`失敗：${failures.length} 個檔案`);
    failures.forEach(({ filename, reason }) => console.error(`- ${filename}: ${reason}`));
    process.exitCode = 1;
  }
}

run().then(
  () => process.exit(process.exitCode || 0),
  (error) => {
    console.error(`匯入失敗：${error.message}`);
    process.exit(1);
  },
);
