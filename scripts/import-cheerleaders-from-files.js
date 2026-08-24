import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import * as fb from '../src/firebase.js';

const defaultDirectory = path.resolve('doc/exportCheerSchedule');
const dryRun = process.argv.includes('--dry-run');
const adminPassword = process.env.ADMIN_PASSWORD || '5566';
const filenamePattern = /^(\d{4}-\d{2}-\d{2})_(T[1-6])\.json$/;

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  const prefixArg = process.argv.find(arg => arg.startsWith(`${flag}=`));
  if (prefixArg) {
    return prefixArg.slice(flag.length + 1);
  }
  return null;
}

const sinceArg = getArgValue('--since');
const untilArg = getArgValue('--until');
const dateArg = getArgValue('--date');
const monthArg = getArgValue('--month');
const dirArg = getArgValue('--dir');

// 支援拖曳路徑或位置參數 (排除 flags 的值)
const flagsWithValues = new Set(['--since', '--until', '--date', '--month', '--dir']);
const positionalArgs = process.argv.slice(2).filter((arg, i, arr) => {
  if (arg.startsWith('-')) return false;
  const prev = arr[i - 1];
  if (prev && flagsWithValues.has(prev)) return false;
  return true;
});
const positionalArg = positionalArgs[0];

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

async function collectFiles(targetPath) {
  const fileList = [];

  async function scan(currentPath) {
    const fileStats = await stat(currentPath);
    if (fileStats.isFile()) {
      if (currentPath.toLowerCase().endsWith('.json')) {
        fileList.push({
          fullPath: currentPath,
          filename: path.basename(currentPath),
        });
      }
      return;
    }

    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await scan(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        fileList.push({
          fullPath: full,
          filename: entry.name,
        });
      }
    }
  }

  await scan(targetPath);
  return fileList.sort((a, b) => a.filename.localeCompare(b.filename));
}

async function run() {
  console.log(`=== 從 JSON ${dryRun ? '檢查' : '匯入'}啦啦隊班表 ===`);

  let targetDirectory = defaultDirectory;
  if (dirArg) {
    targetDirectory = path.resolve(dirArg);
  } else if (positionalArg) {
    targetDirectory = path.resolve(positionalArg);
  } else if (monthArg) {
    const cleanMonth = monthArg.replace('-', '');
    const candidateMonthPath = path.resolve(defaultDirectory, cleanMonth);
    try {
      await stat(candidateMonthPath);
      targetDirectory = candidateMonthPath;
    } catch {
      targetDirectory = defaultDirectory;
    }
  }

  let files = [];
  try {
    files = await collectFiles(targetDirectory);
  } catch (error) {
    throw new Error(`無法讀取目錄或檔案：${targetDirectory} (${error.message})`);
  }

  if (monthArg) {
    const normalizedMonth = monthArg.includes('-') ? monthArg : `${monthArg.slice(0, 4)}-${monthArg.slice(4, 6)}`;
    files = files.filter(f => {
      const match = f.filename.match(/^(\d{4}-\d{2})/);
      return match && match[1] === normalizedMonth;
    });
    console.log(`[過濾條件] 指定月份：${normalizedMonth}`);
  }
  if (sinceArg) {
    files = files.filter(f => {
      const match = f.filename.match(/^(\d{4}-\d{2}-\d{2})_/);
      return match && match[1] >= sinceArg;
    });
    console.log(`[過濾條件] 指定起始日期：${sinceArg} (含) 之後`);
  }
  if (untilArg) {
    files = files.filter(f => {
      const match = f.filename.match(/^(\d{4}-\d{2}-\d{2})_/);
      return match && match[1] <= untilArg;
    });
    console.log(`[過濾條件] 指定截止日期：${untilArg} (含) 之前`);
  }
  if (dateArg) {
    files = files.filter(f => {
      const match = f.filename.match(/^(\d{4}-\d{2}-\d{2})_/);
      return match && match[1] === dateArg;
    });
    console.log(`[過濾條件] 指定特定日期：${dateArg}`);
  }

  console.log(`[掃描路徑] ${targetDirectory}`);
  console.log(`[目標數量] 找到 ${files.length} 個 JSON 檔案\n`);

  if (files.length === 0) throw new Error(`沒有符合條件的 JSON 檔案`);

  const schedules = await fb.getSchedules();
  if (!schedules) throw new Error('Firebase 中沒有賽程資料，請先同步賽程');

  const pending = [];
  const failures = [];

  for (const { fullPath, filename } of files) {
    try {
      const data = JSON.parse(await readFile(fullPath, 'utf8'));
      const schedule = validateFile(filename, data);
      const { game, isFallback } = findGame(schedules, schedule);
      pending.push({ filename, fullPath, game, schedule, isFallback });
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
