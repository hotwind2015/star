'use strict';

/**
 * @author      hustcer
 * @license     MIT
 * @copyright   uzfin.com
 * @create      07/10/2015
 */
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import {Command} from 'commander';
import { conf } from './conf.js';

const cmd = new Command()

export const Common = {
    /**
     * 获取用户home目录路径
     * @return {String}  User home path
     */
    getUserHome() {
        return process.env[(process.platform === 'win32') ? 'SystemDrive' : 'HOME'];
    },
    /**
     * 获取股票文件路径，路径查找规则如下：
     * 1. 如果传入股票文件路径参数则将其保存到用户目录的隐藏文件里面，下次可以重复使用不必每次都输入;
     * 2. 如果没有传入股票文件路径参数则先读取配置文件里面的路径参数，读取不到默认找 'symbols.yaml' 文件;
     * @return {String} 股票文件路径
     */
    getSymbolFilePath() {
        let symbolFile = '';
        let starConf = {};
        const starConfPath = path.join(Common.getUserHome(), conf.starConfFile);
        const confExist = fs.existsSync(starConfPath);

        if (cmd.file) {
            symbolFile = cmd.file;
            starConf = confExist ? JSON.parse(fs.readFileSync(starConfPath, 'utf8')) : {};
            starConf.symbolFile = symbolFile;
            fs.writeFile(starConfPath, JSON.stringify(starConf, null, 4), e => { if (e) throw e; });
            return symbolFile;
        }
        if (confExist) {
            starConf = JSON.parse(fs.readFileSync(starConfPath, 'utf8'));
            symbolFile = starConf.symbolFile || conf.symbolFile;
            return symbolFile;
        }
        return conf.symbolFile;
    },
    /**
     * Check duplication of symbols.
     * @param  {Object} counter An object whose key is the symbol code and the value is code counter
     * @return {Object}         Duplication status object.
     */
    checkDup(counter) {
        const dup = { dup: false, dupCode: null, times: 1 };

        _.forOwn(counter, (v, k) => {
            if (v > 1) {
                dup.dup = true;
                dup.dupCode = k;
                dup.times = v;
                return false;
            }
        });

        return dup;
    },
    /**
     * JsonP 解析
     * @param  {String} jsonpData A jsonP response.
     * @return {Object}           The JSON Object.
     */
    parseJsonP(jsonpData) {
        const startPos = jsonpData.indexOf('({');
        const endPos = jsonpData.indexOf('})');
        const jsonString = jsonpData.substring(startPos + 1, endPos + 1);
        return JSON.parse(jsonString);
    },
};