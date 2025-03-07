'use strict';

/**
 * @author      hustcer
 * @license     MIT
 * @copyright   uzfin.com
 * @create      07/13/2015
 */

import * as cheerio from 'cheerio';
import columnify from 'columnify';
import request from 'request';
import { conf } from './conf.js';

const start = new Date().getTime();

function showCal() {
    return request(conf.cal, (e, r, body) => {
        if (e || (r && r.statusCode !== 200)) {
            /* eslint no-unused-expressions:0 */
            console.error(`Request error, Please try again later. Error info:${r.statusCode}, ${r.statusMessage}`);
            return false;
        }

        const html = body.toString();
        const $ = cheerio.load(html, { decodeEntities: false });
        const $rows = $('li.list');
        let $date = null;
        let evt = null;
        let date = null;
        const evts = [];

        const headers = { time: '时间', title: '事件',relatedStocks:'相关股票' };
        const option = {
            minWidth: 5,
            columnSplitter: '    ',
            headingTransform: h => headers[h].em.underline,
        };

        console.log((`\n中国股市未来30日题材前瞻${' '.repeat(60)}\n`).em.underline);

        $rows.each((index, element) => {
            const $item = $(element);

            // ----------------------------
            // 1. 提取标题（Title）
            // ----------------------------
            const title = $item.find('h4 a')
                .text()
                .trim()                      // 去除首尾空格
                .replace(/\s+/g, ' ');       // 合并中间多余空格

            const titleLink = $item.find('h4 a').attr('href');
            const time = $item.find('time').text().trim();
            // ----------------------------
            // 2. 提取相关股票（Related Stocks）
            // ----------------------------
            let relatedStocks = '';

            // 定位到股票区域，遍历每个股票链接
            $item.find('.related-stock a[href*="/quote/"]').each((i, stockElement) => {
                const $stock = $(stockElement);

                // 跳过不需要的链接（如 class="to-multi"）
                if ($stock.hasClass('to-multi')) return;

                // 提取完整文本（例如："紫光股份000938"）
                const rawText = $stock.text().trim();

                // 使用正则拆分名称和代码
                const stockName = rawText.replace(/\d+/g, '').replace(/%/g, '').replace(/\n/g, '').trim();  // 去数字得名称
                const stockCode = rawText.match(/\d+/)?.[0] || '';     // 提取数字得代码

                // 组合数据
                relatedStocks = relatedStocks ===''? `(${stockCode})${stockName} ` : (relatedStocks + `,(${stockCode})${stockName} `);
            });
            evts.push({
                time,
                title,
                relatedStocks
            });
        });
        console.log(columnify(evts,option));

        const end = new Date().getTime();
        console.log((`\n${' '.repeat(80)}\n`).underline.yellow);
        console.log(' '.repeat(20) + 'Done!'.header, '操作耗时:', (`${end - start} ms`).em,
            ' '.repeat(15), 'By uzfin.com\n');
        return false;
    });
}

export const Cal = {
    showCal,
};