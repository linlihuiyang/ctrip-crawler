import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Task } from './src/task/task';
import { Schedule } from './src/task/schedule';
import { Browser } from 'puppeteer';
// import * as readlineSync from 'readline-sync';
import { formatDate } from './src/util/util';
import { newFolder } from './src/util/file-util';

let readFile = promisify(fs.readFile);

(async () => {
  let cf = await readFile(path.join(__dirname, '../config/config.txt'));
  let config = cf.toString().split('\n');

  let date = config[1] || formatDate(new Date());
  let thread = parseInt(config[3]);
  let headless = config[5] == 'Y' ? false : true;
  thread = headless ? thread : 1;
  console.log(`加载配置文件\n 日期:${date}, 窗口显示:${!headless}, 线程数:${thread}`);

  // headless = !readlineSync.keyInYNStrict('你是否想要观看爬取过程?');
  // date = readlineSync.question(`输入要抓取的航班日期(默认${date}): `, { defaultInput: date });

  let resultFolder = path.join(__dirname, '../result');
  await newFolder(resultFolder);
  let subFolder = path.join(resultFolder, date);
  await newFolder(subFolder);

  const browser = await puppeteer.launch({ headless: headless });
  await login(browser);
  let fs1 = await readFile(path.join(__dirname, '../config/from-airport.txt'));
  let fs2 = await readFile(path.join(__dirname, '../config/to-airport.txt'));
  let fs3 = await readFile(path.join(__dirname, '../config/save.txt'));
  let fs4 = await readFile(path.join(__dirname, '../config/fail.txt'));
  let fromList = fs1.toString().split('\n');
  let toList = fs2.toString().split('\n');
  let errList = fs4.toString().split('\n');
  let from_index = 0,
    to_index = 0;
  removeEmptyLine(fromList);
  removeEmptyLine(toList);
  removeEmptyLine(errList);
  console.log(`找到起飞机场${fromList.length}个，目的机场${toList.length}个`);
  let [temp_from, temp_to] = fs3.toString().split('\n');
  if (temp_from != '' && temp_to != '') {
    from_index = fromList.indexOf(temp_from);
    to_index = toList.indexOf(temp_to);
    if (from_index != -1 && to_index != -1) {
      console.log(`上次运行到从 ${temp_from}(${from_index}) 到 ${temp_to}(${to_index}) 的航班，有${errList.length}个失败航班，正在继续`);
    } else {
      from_index = 0;
      to_index = 0;
    }
  }
  fs.writeFile(path.join(__dirname, '../config/fail.txt'), ``, () => {});
  let taskList: Task[] = [];
  try {
    for (var i = 0; i < errList.length; i++) {
      let [from, to] = errList[i].split(',');
      if (from != '' && to != '' && from != to) {
        let task = new Task(browser, from, to, date);
        taskList.push(task);
      }
    }
    for (var i = from_index; i < fromList.length; i++) {
      for (var j = 0; j < toList.length; j++) {
        if (i == from_index && j < to_index) {
          continue;
        }
        let from = fromList[i];
        let to = toList[j];
        if (from != '' && to != '' && from != to) {
          let task = new Task(browser, from, to, date);
          taskList.push(task);
        }
      }
    }
    console.log(`开始执行任务`);

    let schedule = new Schedule(taskList);
    // 如果观看的话，一次只执行一个任务
    await schedule.start(thread);
    await browser.close();
  } catch (error) {
    console.log(error);
  }

  async function login(browser: Browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    await page.goto('https://passport.ctrip.com/user/login?BackUrl=http%3A%2F%2Fwww.ctrip.com%2F');
    let username = '18936040203';
    let password = '18936040203';
    await page.type('#nloginname', username, { delay: 0 });
    await page.type('#npwd', password, { delay: 0 });
    let button = await page.$('#nsubmit');
    await button.click();
    await page.waitFor(2000);
    await page.close();
  }

  function removeEmptyLine(content: string[]) {
    if (content[content.length - 1] == '') {
      content.splice(content.length - 1, 1);
    }
  }
})();
