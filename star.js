#!/usr/bin/env node

/**
 * @author      hustcer
 * @license     MIT
 * @copyright   uzfin.com
 * @create      05/18/2015
 */

'use strict';

import _ from 'lodash';
import colors from 'colors';
import Promise from 'bluebird';
import {Command} from 'commander';
import { conf } from './lib/conf.js';
import {cmd}  from './lib/cmd.js'
// import pkg from './package.json' with { type: 'json' };
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const COLOR_THEME = {
    error: 'red',
    info: 'blue',
    data: 'grey',
    header: 'blue',
    warn: 'yellow',
    em: 'magenta',
};

colors.setTheme(COLOR_THEME);

[process.stdout, process.stderr].forEach(stream => {
    if (stream._handle && typeof stream._handle.setBlocking === 'function') {
        stream._handle.setBlocking(true);
    }
});

const program = new Command()

program
    .version(pkg.version)
    .usage(`[options]${' OR'.em} star code1,code2，code3...，codeN`)
    .description('Star is a command line tool for STock Analysis and Research.')
    .option('-a, --all', 'display all stocks.')
    .option('-o, --hold', 'display all held stocks.')
    .option('-M, --margin', 'display stocks that support Margin.')
    .option('-C, --cal', 'display finance calendar of the future month.')
    .option('-I, --ignore', 'display all ignored stocks.')
    .option('-i, --insider [c]', 'display insider trading records of specified stocks. data source: sse or szse')
    .option('--code [code]', 'specify the stock code of insider tradings you want to query. data source: uzfin.com')
    .option('--market <mkt>', (`specify the market of insider trading query, case insensitive:SZM-深圳主板, SZGEM-深圳创业板, SZSME-深圳中小板,
                     SHM-上海主板. multiple market should be separated by "," or "，". `))
    .option('--top-buy', 'query top buy of insider tradings, should be used with "-i" or "--insider". time span:1m~12m.')
    .option('--top-sell', 'query top sell of insider tradings, should be used with "-i" or "--insider". time span:1m~12m.')
    .option('--latest-sz', 'query latest insider tradings of ShenZhen market, should be used with "-i" or "--insider". data source: szse')
    .option('--latest-sh', 'query latest insider tradings of ShangHai market, should be used with "-i" or "--insider". data source: sse')
    .option('--show-detail', 'show detail latest insider trading records, should be used with "-i" or "--insider".')
    .option('-w, --watch [c1...]', 'watch specified stocks or watch all the stocks in watch list.')
    .option('-r, --reverse', 'sort stocks in ascending order according to designated field.')
    .option('-l, --limit <n>', 'set total display limit of current page.', parseInt)
    .option('-p, --page  <n>', 'specify the page index to display.', parseInt)
    .option('-d, --data  <data>', 'specify data provider, should be one of "sina" or "tencent".')
    .option('-f, --file  <file>', 'specify the symbol file path.')
    .option('--from <2014/06/01>', 'specify the beginning date of insider tradings.')
    .option('--to <2015/07/09>', 'specify the ending date of insider tradings.')
    .option('--span <3m>', 'specify the month span of insider tradings ahead of today, should be 1m~24m.')
    .option('-L, --lte   <pct> ', 'filter the symbols whose upside potential is lower than or equal to the specified percentage.', parseInt)
    .option('-G, --gte   <pct> ', 'filter the symbols whose upside potential is greater than or equal to the specified percentage.', parseInt)
    .option('-U, --under <star>', 'filter the symbols whose star is under or equal to the specified star value.', parseInt)
    .option('-A, --above <star>', 'filter the symbols whose star is above or equal to the specified star value.', parseInt)
    .option('--lteb [pct]', "filter the symbols whose current price is lower than or equal to it's buy/cheap price", parseInt)
    .option('--gtes [pct]', "filter the symbols whose current price is greater than or equal to it's sell/expensive price", parseInt)
    .option('-g, --grep  <kw>  ', 'specify the keyword to grep in name or comment, multiple keywords should be separated by ",".')
    .option('--remove  <kw>    ', (`remove the symbols from result with the specified keywords in name or comment, multiple keywords
                     should be separated by ",".`))
    .option('-e, --exclude <pre>', (`exclude stocks whose code number begin with: 300,600,002 or 000, etc. multiple prefixs can be
                     used and should be separated by "," or "，". `))
    .option('-c, --contain <pre>', `display stocks whose code number begin with: 300,600,002 or 000, etc. multiple prefixs can be
                     used and should be separated by "," or "，". `)
    .option('-s, --sort <sort>', (`specify sorting field, could be sorted by: code/star/price/targetp/incp/bdiff/sdiff/capacity/
                     pe/pb to sort stocks by code, star, price, price to target percent, price increase percent,
                     (s.price - s.cheap)/s.price, (s.price - s.expensive)/s.price, capacity, PE and PB separately.
                     and sort by capacity/pe/pb only works while using tencent data source.`))
    .parse(process.argv);

Object.assign(cmd, program.opts())

const actions = {
    WATCH: async function watch() {
        const { Watch } = await import('./lib/watch.js');
        Watch.doWatch(cmd.watch);
    },
    CAL: async function cal() {
        const { Cal } = await import('./lib/cal.js');
        Cal.showCal();
    },
    INSIDER: async function insider() {
        const async = await import('async');
        const { Insider } = await import('./lib/insider.js');

        if (cmd.latestSz) { Insider.querySZLatest(); return false; }
        if (cmd.latestSh) { Insider.querySHLatest(); return false; }
        if (cmd.topBuy) { Insider.queryTopList('BV'); return false; }
        if (cmd.topSell) { Insider.queryTopList('SV'); return false; }
        if (cmd.insider === true) { Insider.queryInsider(); return false; }

        const query = cmd.insider.replace(/，/g, ',');
        const symbols = _.trimEnd(query, ',').split(',');
        if (symbols.length > conf.chunkSize) {
            console.error((`You can query at most ${conf.chunkSize} symbols once.`).error);
            return false;
        }

        async.eachSeries(symbols, (c, callback) => {
            Insider.queryInsider(c, callback);
        }, () => {
            console.log('ALL DONE!');
        });
        return false;
    },
    QUERY: async function query() {
        const { Query } = await import('./lib/query.js');
        Query.doQuery(cmd.args[0]);
    },
    TRACE: async function trace() {
        const { Trace } = await import('./lib/trace.js');
        const symbols = await Trace.getFilteredSymbols();

        if (!symbols) { return false; }

        const symList = _.chunk(symbols, conf.chunkSize);

        await Promise
            .resolve(symList)
            .each(syms => Trace.querySymbols(syms))
            .then(() => Trace.printResults())
            .then(() => Trace.printSummary());

        return false;
    },
};

async function doCmd() {
    let action = 'TRACE';

    if (cmd.watch) { action = 'WATCH'; }
    if (cmd.insider) { action = 'INSIDER'; }
    if (cmd.cal) { action = 'CAL'; }

    if (program.args.length === 1) {
        action = 'QUERY';
    } else if (program.args.length > 1) {
        console.error('Input error, please try again, or run "star -h" for more help.'.error);
        return false;
    }

    await actions[action]();
    return false;
}

doCmd().catch(e => console.error('Error occurred:', e));