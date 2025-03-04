'use strict';

/**
 * @author      hustcer
 * @license     MIT
 * @copyright   uzfin.com
 * @create      06/18/2015
 */

import vm from 'vm';
import _ from 'lodash';
import Promise from 'bluebird';
import {Command} from 'commander';
import columnify from 'columnify';
import { conf } from './conf.js';
import { Iconv } from 'iconv';
import request from 'request';
import { Common } from './common';

const start = new Date().getTime();
const iconv = new Iconv('GBK', 'UTF-8//TRANSLIT//IGNORE');
const promisifiedRequest = Promise.promisifyAll(request, { multiArgs: true });

/* eslint no-unused-vars:0 */

const MSG = {
    INPUT_ERROR: '输入错误，当前只支持通过证券代码查询，请检查后重新输入！',
    TOO_MANY_SYMS: '查询的股票太多，一次最多支持查询25只股票！',
    SYMBOL_NOT_EXIST: '该股票代码不存在:',
};

const ClientError = e => (e.code >= 400 && e.code < 500 || e.code === 'ENOTFOUND');

const cmd = new Command()

let queryResults = [];
const src = (cmd.data || '').toUpperCase();
const source = (src === 'SINA' || src === 'TENCENT') ? src : conf.dataSource;
const ds = conf.provider[source];

function getValidSymbols(syms) {
    const symbols = syms.replace(/，/g, ',');
    const valid = /^[0-9,]+$/.test(symbols);
    if (!valid) {
        console.error(MSG.INPUT_ERROR.error);
        return false;
    }
    const symbolArray = _.trimEnd(symbols, ',').split(',');
    if (symbolArray.length > conf.chunkSize) {
        console.error(MSG.TOO_MANY_SYMS.error);
        return false;
    }
    return symbolArray;
}

async function querySymbols(syms) {
    const query = _.map(syms, x => conf.market[x.substr(0, 3)] + x).join(',');

    try {
        const [resp, body] = await promisifiedRequest.getAsync(ds.url + query, { encoding: null });
        const convertedBody = iconv.convert(body).toString();
        vm.runInThisContext(convertedBody);

        _.each(syms, s => {
            const localVar = ds.flag + conf.market[s.substr(0, 3)] + s;
            if (convertedBody.indexOf(localVar) < 0 || convertedBody.indexOf(`${localVar}="";`) >= 0) {
                console.error(MSG.SYMBOL_NOT_EXIST.error, s.em);
                return false;
            }
            const res = {};
            const splits = vm.runInThisContext(ds.flag + conf.market[s.substr(0, 3)] + s).split(ds.sep);
            res.name = splits[ds.nameIdx];
            res.code = s;
            res.open = +splits[ds.openIdx];
            res.close = +splits[ds.closeIdx];
            res.price = +splits[ds.priceIdx] || res.close;
            res.low = +splits[ds.lowIdx];
            res.high = +splits[ds.highIdx];
            res.inc = res.price - res.close;
            res.incPct = ((res.price - res.close) / res.close) * 100;
            res.capacity = (ds.capIdx > -1) ? +splits[ds.capIdx] : 0;
            res.pe = (ds.peIdx > -1) ? +splits[ds.peIdx] : 0;
            res.pb = (ds.pbIdx > -1) ? +splits[ds.pbIdx] : 0;

            _.forEach(res, (v, k) => {
                if (k !== 'name' && k !== 'code' && v !== undefined) {
                    res[k] = v.toFixed(2);
                }
                if (src === 'SINA') {
                    delete res.pe;
                    delete res.pb;
                    delete res.capacity;
                }
            });
            queryResults.push(res);
        });
    } catch (e) {
        if (ClientError(e)) {
            console.error(e);
        }
        throw e;
    }
}

function printResults() {
    const headers = {
        name: '公司', code: '代码', price: '当前价', inc: '涨跌',
        incPct: '涨跌%', low: '最低', high: '最高', open: '开盘价',
        close: '上次收盘', capacity: '总市值', pe: 'P/E', pb: 'P/B',
    };
    const option = {
        align: 'right',
        columnSplitter: '   ',
        headingTransform: h => headers[h].em.underline,
    };

    console.log(columnify(queryResults, option));
    const end = new Date().getTime();
    console.log(' '.repeat(102).underline.yellow);

    console.log(' '.repeat(15) + 'Done!'.header, '总计查询:', `${queryResults.length}`.em,
        '只股票, 操作耗时:', `${end - start} ms`.em, ' '.repeat(18), 'By uzfin.com\n');
}

function doQuery(syms) {
    Promise
        .resolve(syms)
        .then(getValidSymbols)
        .then(querySymbols)
        .then(printResults)
        .catch(e => console.error('Error occurred:', e));
}

export const Query = {
    doQuery,
};