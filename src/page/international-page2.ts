import { FlightPage } from './page';
import { FlightInfo } from '../flight/flight-info';
import { Page } from 'puppeteer';
import { InternationalFlightCreator2 } from '../flight/international-flight-creator2';

export class InternationalFlightPage2 implements FlightPage {
  flightList: FlightInfo[];
  page: Page;

  constructor(page: Page) {
    this.page = page;
    this.flightList = [];
  }

  async verifyURL(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.page.once('load', () => {
        let url = this.page.url();
        resolve(url.indexOf('flights.ctrip.com/international/') != -1);
      });
    });
  }

  async wait(): Promise<void> {
    await this.page.waitFor('#loading', { hidden: true });
    await this.page.waitFor(20);
    await this.page.waitFor('img[src*=loading]', { hidden: true });
    await this.page.waitFor(20);
  }

  async beforeDownload(): Promise<void> {
    // 滚动到底部
    await this.page.evaluate(() => {
      return new Promise(resolve => {
        let scroll_times = 0; // 滚动次数,滚动10次还没到底，就不再滚动
        let interval = setInterval(() => {
          if (scroll_times < 10 && window.scrollY + window.innerHeight < document.body.scrollHeight) {
            window.scroll(0, document.body.scrollHeight);
            scroll_times++;
          } else {
            clearInterval(interval);
            setTimeout(() => {
              resolve();
            }, 200);
          }
        }, 200);
      });
    });
  }
  async getFlightList(): Promise<FlightInfo[]> {
    // 国际
    let flightList = await this.page.$$('.flight-item');

    for (let i = 0; i < flightList.length; i++) {
      let flight = flightList[i];
      let creator = new InternationalFlightCreator2(flight, this.page);
      let flightInfo = await creator.createFlightInfo();
      this.flightList.push(flightInfo);
    }

    return this.flightList;
  }

  async fromAirportName(): Promise<string> {
    return await this.page.evaluate(() => {
      let input = <HTMLInputElement>document.querySelector('input[name=owDCity]');
      return input && input.value;
    });
  }

  async toAirportName(): Promise<string> {
    return await this.page.evaluate(() => {
      let input = <HTMLInputElement>document.querySelector('input[name=owACity]');
      return input && input.value;
    });
  }
}
