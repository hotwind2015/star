'use strict';

/**
 * @author      hustcer
 * @license     MIT
 * @copyright   uzfin.com
 * @create      06/16/2015
 */
import vm from 'vm';
import fs from 'fs';
import _ from 'lodash';
import yaml from 'js-yaml';
import Promise from 'bluebird';
import {Command} from 'commander';
import columnify from 'columnify';
import { conf } from './conf.js';
import { Iconv } from 'iconv';
import request from 'request';
import { Common } from './common.js';

const start = new Date().getTime();
const iconv = new Iconv('GBK', 'UTF-8//TRANSLIT//IGNORE');
const promisifiedRequest = Promise.promisifyAll(request, { multiArgs: true });

const cmd = new Command()

conf.limit = cmd.limit || conf.limit;

let totalSymbols;
const src = (cmd.data || '').toUpperCase();
const source = (src === 'SINA' || src === 'TENCENT') ? src : conf.dataSource;
const ds = conf.provider[source];

let results = [];
let page = [];

const ClientError = e => (e.code >= 400 && e.code < 500 || e.code === 'ENOTFOUND');

async function getFilteredSymbols() {
    const syms = yaml.load(fs.readFileSync(Common.getSymbolFilePath(), 'utf8')).symbols;
    const counter = _.countBy(syms, s => s.code);
    const dup = Common.checkDup(counter);
    if (dup.dup) {
        console.error((`Symbol: ${dup.dupCode} is duplicate, there are ${dup.times} stocks has the same code.\n`).error);
        return false;
    }

    let filteredSyms = syms;

    if (!cmd.all && !cmd.ignore && !cmd.hold) {
        filteredSyms = _.filter(filteredSyms, s => s.watch);
    }
    if (cmd.ignore) {
        filteredSyms = _.filter(filteredSyms, s => !s.watch);
    }
    if (cmd.hold) {
        filteredSyms = _.filter(filteredSyms, s => s.hold);
    }

    if (cmd.exclude) {
        filteredSyms = _.filter(filteredSyms, s => {
            let exclude = false;
            const prefixs = cmd.exclude.replace(/，/g, ',').split(',');
            _.each(prefixs, pre => {
                if (s.code.startsWith(pre)) {
                    exclude = true;
                    return false;
                }
            });
            return !exclude;
        });
    }

    if (cmd.contain) {
        filteredSyms = _.filter(filteredSyms, s => {
            let contain = false;
            const prefixs = cmd.contain.replace(/，/g, ',').split(',');
            _.each(prefixs, pre => {
                if (s.code.startsWith(pre)) {
                    contain = true;
                    return false;
                }
            });
            return contain;
        });
    }

    if (cmd.grep) {
        filteredSyms = _.filter(filteredSyms, s => {
            let find = false;
            const kws = cmd.grep.replace(/，/g, ',').split(',');
            _.each(kws, kw => {
                const reg = new RegExp(kw, 'i');
                if (reg.test(s.comment) || reg.test(s.name) || reg.test(s.code)) {
                    find = true;
                    return false;
                }
            });
            return find;
        });
    }

    if (cmd.remove) {
        filteredSyms = _.filter(filteredSyms, s => {
            let find = false;
            const kws = cmd.remove.replace(/，/g, ',').split(',');
            _.each(kws, kw => {
                const reg = new RegExp(kw, 'i');
                if (reg.test(s.comment) || reg.test(s.name)) {
                    find = true;
                    return true;
                }
            });
            return !find;
        });
    }

    if (cmd.above || cmd.above === 0) {
        filteredSyms = _.filter(filteredSyms, s => Math.floor(s.star) >= cmd.above);
    }
    if (cmd.under || cmd.under === 0) {
        filteredSyms = _.filter(filteredSyms, s => Math.floor(s.star) <= cmd.under);
    }

    if (cmd.margin) {
        const rzrq = await import('./rzrq.json', {assert: {type: 'json'}});
        filteredSyms = _.filter(filteredSyms, s => rzrq.default[s.code]);
    }

    return filteredSyms;
}

async function querySymbols(syms) {
    const query = _.map(syms, x => conf.market[x.code.substr(0, 3)] + x.code).join(',');

    try {
        const [resp, body] = await promisifiedRequest.getAsync(ds.url + query, { encoding: null });
        vm.runInThisContext(iconv.convert(body).toString());

        _.each(syms, s => {
            const splits = vm.runInThisContext(ds.flag + conf.market[s.code.substr(0, 3)] + s.code).split(ds.sep);
            s.close = +splits[ds.closeIdx];
            s.price = +splits[ds.priceIdx] || s.close;
            s.pct = ((s.target - s.price) / s.price) * 100;
            s.incPct = ((s.price - s.close) / s.close) * 100;
            s.capacity = (ds.capIdx > -1) ? +splits[ds.capIdx] : 0;
            s.pe = (ds.peIdx > -1) ? +splits[ds.peIdx] : 0;
            s.pb = (ds.pbIdx > -1) ? +splits[ds.pbIdx] : 0;
            s.bdiff = 100 * (s.price - s.cheap) / s.price;
            s.sdiff = 100 * (s.price - s.expensive) / s.price;
        });
        results = results.concat(syms);
    } catch (e) {
        if (ClientError(e)) {
            console.error(e);
        }
        throw e;
    }
}

function printResults() {
    process.stdout.write('\u001b[2J\u001b[0;0H');

    if (cmd.lte || cmd.lte === 0) { results = _.filter(results, s => s.pct <= cmd.lte); }
    if (cmd.gte || cmd.gte === 0) { results = _.filter(results, s => s.pct >= cmd.gte); }

    if (cmd.lteb || cmd.lteb === 0) {
        results = _.filter(results, s => {
            if (cmd.lteb === true) { return s.price <= s.cheap; }
            return cmd.lteb >= s.bdiff;
        });
    }

    if (cmd.gtes || cmd.gtes === 0) {
        results = _.filter(results, s => {
            if (cmd.gtes === true) { return s.price >= s.expensive; }
            return cmd.gtes <= s.sdiff;
        });
    }

    const ascending = cmd.reverse ? 1 : -1;
    const sort = conf.sort[cmd.sort] || conf.defaultSort;
    results = _.sortBy(results, s => ascending * s[sort]);

    totalSymbols = results.length;

    if (!cmd.all) {
        const chunks = _.chunk(results, conf.limit);
        if (!cmd.page || cmd.page < 0) {
            page = chunks[0];
        } else if (cmd.page >= chunks.length) {
            page = chunks[chunks.length - 1];
        } else {
            page = chunks[cmd.page];
        }
    } else {
        page = results;
    }

    const headers = {
        name: '公司', code: '代码', price: '当前价', incPct: '涨跌%',
        cheap: '买点', expensive: '卖点', target: '目标价', pct: '上涨空间%',
        star: '星级', capacity: '总市值', pe: 'P/E', pb: 'P/B', comment: '备注',
    };

    const ignoreKeys = ['name', 'code', 'comment', 'star', 'hold', 'watch', 'close', 'bdiff', 'sdiff'];
    const data = [];
    const option = {
        align: 'right',
        columnSplitter: '  ',
        config: { comment: { align: 'left', maxWidth: 50 }, star: { align: 'left' } },
        headingTransform: h => headers[h].em.underline,
    };

    _.each(page, s => {
        _.each(s, (v, k) => {
            if (ignoreKeys.indexOf(k) < 0 && v !== undefined) {
                s[k] = v.toFixed(2);
            }
        });
        if (src === 'SINA') {
            _.each(['pe', 'pb', 'capacity'], k => delete s[k]);
        }
        s.pct += ' %';
        s.incPct += ' %';
        s.star = (s.star === Math.floor(s.star)) ? s.star : s.star.toFixed(4);
        data.push(_.pick(s, _.keys(headers)));
    });
    console.log(columnify(data, option));
}

function printSummary() {
    const end = new Date().getTime();
    let fromIdx = Math.min(Math.ceil(results.length / conf.limit) - 1, cmd.page || 0) * conf.limit;
    fromIdx = fromIdx >= 0 ? fromIdx : 0;

    console.log('\n', ' '.repeat(135).underline.yellow);

    console.log(' '.repeat(35), 'Done!'.header, '总计:', `${totalSymbols}`.em,
        '只股票, 当前显示第', `${fromIdx} - ${(fromIdx + (page || []).length)}`.em, '只, 操作耗时:',
        `${end - start} ms`.em, ' '.repeat(18), 'By uzfin.com\n');
}

export const Trace = {
    getFilteredSymbols,
    querySymbols,
    printResults,
    printSummary,
};