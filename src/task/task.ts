import { InternationalFlightPage } from './../page/international-page';
import { DomesticFlightPage } from '../page/domestic-flight-page';
import * as fs from 'fs';
import { Browser, Page } from 'puppeteer';
import { formatDate } from '../util/util';

import * as path from 'path';
// import { promisify } from 'util';
import { FlightPage } from '../page/page';

// let mkdir = promisify(fs.mkdir);
// let stat = promisify(fs.stat);
export class Task {
  browser: Browser;
  page: Page;
  from: string;
  to: string;
  date: string;
  finished = false;
  constructor(browser: Browser, fromAirport: string, toAirport: string, date?: string) {
    this.browser = browser;
    this.from = fromAirport;
    this.to = toAirport;
    this.date = date || formatDate(new Date());
  }
  async run() {
    let resultFolder = path.join(__dirname, '../../../result');
    let airline = `${this.from}-${this.to}`;
    // let airlineFolder = path.join(resultFolder, airline);
    // try {
    //   await stat(airlineFolder);
    // } catch (error) {
    //   await mkdir(airlineFolder);
    // }
    let csvPath = path.join(resultFolder, `${airline}-${this.date}.csv`);
    // let screenPath = path.join(resultFolder, `${airline}-${this.date}.png`);
    // let errScreenPath = path.join(resultFolder, `${airline}-${date}.png`);
    const page = await this.browser.newPage();
    this.page = page;
    await page.setViewport({ width: 1440, height: 800 });
    try {
      // 进入页面
      await page.goto(`http://flights.ctrip.com/booking/${airline}-day-1.html?ddate1=${this.date}`);
      let p: FlightPage;
      if (page.url().indexOf('flights.ctrip.com/booking/') != -1) {
        // 国内航班
        p = new DomesticFlightPage(page);
      } else {
        // 国际航班
        p = new InternationalFlightPage(page);
      }
      await p.wait();
      await p.beforeDownload();
      let flightList = await p.getFlightList();

      let csv = `航空公司,航班编号,机型,起飞机场,计划起飞时间,是否中转/经停,,,,,,,,,,,,,,,,,,,,到达机场,计划到达时间,总飞行时长,经济票价（元）,总到达准点率
,,,,,第一航段到达机场,第一航段到达时间,第一航段飞行时间,第一航段准点率,中转停留时间,经停机场,第二航段起飞机场,第二航段起飞时间,第二航段飞行时间,第二航段准点率,第二航段中转停留时间,第二航段经停机场,第二航段到达机场,第二航段到达时间,第三航段起飞机场,第三航段起飞时间,第三航段飞行时间,第三航段准点率,第三航段到达机场,第三航段到达时间`;
      flightList.forEach(flight => {
        csv += flight.toCsv();
      });

      fs.writeFile(csvPath, csv, () => {});
      console.log(`${csvPath}\t${flightList.length}条航班`);
      // await page.screenshot({ path: screenPath, fullPage: true });
    } catch (error) {
      console.log(error);
    } finally {
      await page.close();
      this.finished = true;
    }
  }

  cancel() {
    if (!this.finished) {
      this.page.close();
    }
  }
}