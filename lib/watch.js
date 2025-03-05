'use strict';

/**
 * @author      hustcer
 * @license     MIT
 * @copyright   uzfin.com
 * @create      06/24/2015
 */

import vm from 'vm';
import fs from 'fs';
import _ from 'lodash';
import yaml from 'js-yaml';
import blessed from 'blessed';
import Promise from 'bluebird';
import {cmd} from './cmd.js';
import contrib from 'blessed-contrib';
import { conf } from './conf.js';
import { Iconv } from 'iconv';
import request from 'request';

const iconv = new Iconv('GBK', 'UTF-8//TRANSLIT//IGNORE');
const promisifiedRequest = Promise.promisifyAll(request, { multiArgs: true });

let table = null;
const screen = blessed.screen({ fullUnicode: true });

const MSG = {
    INPUT_ERROR: '输入错误，当前只支持通过证券代码看盘，请检查后重新输入！',
    TOO_MANY_SYMS: '输入的股票太多，一次最多支持盯盘25只股票！',
    SYMBOL_NOT_EXIST: '该股票代码不存在:',
};

const ClientError = e => (e.code >= 400 && e.code < 500 || e.code === 'ENOTFOUND');

const src = (cmd.data || '').toUpperCase();
const source = (src === 'SINA' || src === 'TENCENT') ? src : conf.dataSource;
const ds = conf.provider[source];

async function getValidSymbols(syms) {
    if (syms === true) {
        const { Common } = await import('./common');
        const yamlConf = yaml.safeLoad(fs.readFileSync(Common.getSymbolFilePath(), 'utf8'));
        if (!cmd.hold && yamlConf.getOptionValue('watchList') && yamlConf.getOptionValue('watchList').length > 0) {
            syms = _.map(yamlConf.getOptionValue('watchList'), 'code').join(',');
        } else {
            syms = _.filter(yamlConf.getOptionValue('symbols'), s => s.hold);
            syms = _.map(syms, 'code').join(',');
        }
    }
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

function initUI() {
    table = contrib.table({
        keys: true,
        fg: 'white',
        selectedFg: 'black',
        selectedBg: 'cyan',
        interactive: true,
        label: '股票列表',
        width: '55%',
        height: '80%',
        border: { type: 'line', fg: 'cyan' },
        columnSpacing: 5,
        columnWidth: [10, 7, 7, 7, 9],
    });

    /* eslint no-process-exit:0 */
    screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
}

function updateData(queryResults) {
    const queryData = [];
    _.each(queryResults, q => {
        q.name = (q.name.length === 3) ? `  ${q.name}` : q.name;
        q.price = q.price.toFixed(2);
        q.inc = q.inc.toFixed(2);
        q.incPct = `${q.incPct.toFixed(2)} %`;

        queryData.push([q.name, q.code, q.price, q.inc, q.incPct]);
    });

    table.setData({
        headers: ['公司', '代码', '当前价', '涨跌', '涨跌%'],
        data: queryData,
    });
    table.focus();
    screen.append(table);
    screen.render();
}

async function refreshData(syms, query) {
    const queryResults = [];
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
            res.close = +splits[ds.closeIdx];
            res.price = +splits[ds.priceIdx] || res.close;
            res.inc = res.price - res.close;
            res.incPct = ((res.price - res.close) / res.close) * 100;
            queryResults.push(res);
        });

        updateData(queryResults);
    } catch (e) {
        if (ClientError(e)) {
            process.exit(1);
        }
        throw e;
    }
}

function querySymbols(syms) {
    const query = _.map(syms, x => conf.market[x.substr(0, 3)] + x).join(',');
    refreshData(syms, query);
    setInterval(() => refreshData(syms, query), 3600);
}

function doWatch(syms) {
    initUI();
    Promise
        .resolve(syms)
        .then(getValidSymbols)
        .then(querySymbols)
        .catch(e => console.error('Error occurred:', e));
}

export const Watch = {
    doWatch,
};