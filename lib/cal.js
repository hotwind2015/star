'use strict';

/**
 * @author      hustcer
 * @license     MIT
 * @copyright   uzfin.com
 * @create      07/13/2015
 */

import _ from 'lodash';
import strman from 'strman';
import cheerio from 'cheerio';
import columnify from 'columnify';
import request from 'request';
import { conf } from './conf.js';

const start = new Date().getTime();

function showCal() {
    return request(conf.cal, (e, r, body) => {
        if (e || (r && r.statusCode !== 200)) {
            /* eslint no-unused-expressions:0 */
            console.error('Request error, Please try again later. Error info:',
                JSON.stringify(e || r, null, 4)).error;
            return false;
        }

        const html = body.toString();
        const $ = cheerio.load(html, { decodeEntities: false });
        const $rows = $('li', conf.cal.selector);
        let $date = null;
        let evt = null;
        let date = null;
        const evts = [];

        const headers = { date: '日期', evt: '事件' };
        const option = {
            minWidth: 5,
            columnSplitter: '   ',
            headingTransform: h => headers[h].em.underline,
        };

        console.log((`\n中国股市未来30日题材前瞻${' '.repeat(60)}\n`).em.underline);

        $rows.each(function stripEvts() {
            $date = $('.body-date', this);

            if ($date.length) {
                date = _.trim($date.html());
                evt = strman.collapseWhitespace($('.event-relative-container', this).text());
                evt = strman.htmlDecode(evt).replace(/当日复牌/g, '当日复牌:');
                evts.push({ date, evt: _.trimStart(_.trim(evt), ', ') });
            }
        });
        console.log(columnify(evts, option));

        const end = new Date().getTime();
        console.log(' '.repeat(80).underline.yellow);
        console.log(' '.repeat(20) + 'Done!'.header, '操作耗时:', (`${end - start} ms`).em,
            ' '.repeat(15), 'By uzfin.com\n');
        return false;
    });
}

export const Cal = {
    showCal,
};