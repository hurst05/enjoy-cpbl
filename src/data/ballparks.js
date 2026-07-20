export const BALLPARKS = {
  '嘉義市': { city: '嘉義市', district: '東區', cwaPid: 'K008' },
  '新莊': { city: '新北市', district: '新莊區', cwaPid: 'K002' },
  '澄清湖': { city: '高雄市', district: '鳥松區', cwaPid: 'K010' },
  '天母': { city: '臺北市', district: '士林區', cwaPid: 'K001' },
  '花蓮': { city: '花蓮縣', district: '花蓮市', cwaPid: 'K015' },
  '斗六': { city: '雲林縣', district: '斗六市', cwaPid: 'K007' },
  '台東': { city: '臺東縣', district: '臺東市', cwaPid: 'K014' },
  '洲際': { city: '臺中市', district: '北屯區', cwaPid: 'K005' },
  '樂天桃園': { city: '桃園市', district: '中壢區', cwaPid: 'K003' },
  '大巨蛋': { city: '臺北市', district: '信義區', cwaPid: 'K017' },
  '亞太主': { city: '臺南市', district: '安南區', cwaPid: 'K019' },
};

const CWA_BALLPARK_URL = 'https://www.cwa.gov.tw/V8/C/L/Ballpark/Ballpark.html';

export function getCwaBallparkUrl(location) {
  const pid = BALLPARKS[location]?.cwaPid;
  return pid ? `${CWA_BALLPARK_URL}?PID=${pid}` : CWA_BALLPARK_URL;
}

export const CWA_DATASETS = {
  '嘉義市': { shortTerm: 'F-D0047-057', weekly: 'F-D0047-059' },
  '新北市': { shortTerm: 'F-D0047-069', weekly: 'F-D0047-071' },
  '高雄市': { shortTerm: 'F-D0047-065', weekly: 'F-D0047-067' },
  '臺北市': { shortTerm: 'F-D0047-061', weekly: 'F-D0047-063' },
  '花蓮縣': { shortTerm: 'F-D0047-041', weekly: 'F-D0047-043' },
  '雲林縣': { shortTerm: 'F-D0047-025', weekly: 'F-D0047-027' },
  '臺東縣': { shortTerm: 'F-D0047-037', weekly: 'F-D0047-039' },
  '臺中市': { shortTerm: 'F-D0047-073', weekly: 'F-D0047-075' },
  '桃園市': { shortTerm: 'F-D0047-005', weekly: 'F-D0047-007' },
  '臺南市': { shortTerm: 'F-D0047-077', weekly: 'F-D0047-079' },
};
