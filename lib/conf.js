'use strict';

// 腾讯股票数据接口: http://qt.gtimg.cn/q=
// 新浪股票数据接口: http://hq.sinajs.cn/list=
// 采用腾讯的数据接口会显示市值信息，采用新浪的接口不显示市值
export const conf = {
    provider: {
        SINA: {
            url: 'http://hq.sinajs.cn/list=',
            flag: 'hq_str_',
            sep: ',',
            nameIdx: 0,
            priceIdx: 3,
            openIdx: 1,
            closeIdx: 2,
            lowIdx: 5,
            highIdx: 4,
            capIdx: -1,
            peIdx: -1,
            pbIdx: -1,
        },
        TENCENT: {
            url: 'http://qt.gtimg.cn/q=',
            flag: 'v_',
            sep: '~',
            nameIdx: 1,
            priceIdx: 3,
            openIdx: 5,
            closeIdx: 4,
            lowIdx: 34,
            highIdx: 33,
            capIdx: 45,
            peIdx: 39,
            pbIdx: 46,
        },
    },
    cal: {
        method: 'GET',
        url: 'http://www.yuncaijing.com/insider/simple.html',  //http://www.yuncaijing.com/news/get_realtime_news/yapi/ajax.html?page=1&yesterday=0
        headers: {
            Host: 'www.yuncaijing.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            // Cookie: 'ycj_wafsid=wafsid_b417bf4267e2d99759be30e888ddaf76; ycj_uuid=816acb22241466db89e4da5a5d3df37d; ycj_locate=aHR0cDovL3d3dy55dW5jYWlqaW5nLmNvbS9mdXR1cmVuZXdzLmh0bWw%3D; YUNSESSID=m02aahlhaiqn1gr3js35l0irb3; Hm_lvt_b68ec780c488edc31b70f5dadf4e94f8=1741337439,1741344970; HMACCOUNT=649C147B6F616586; cf_clearance=HiatqFneSWEdXSQk5hqyrPGeprnzBIJkocrdMJ6miMc-1741344987-1.2.1.1-9uCM7qHF3Iwcwctla7.1oaL_6ghVEs3M8jNjnfrd39UArepngVfffzDylJ_7EfKWV8mO4Kn2fCZlRzVqQR.3clX1r0bZMy_dM8M51d3Ne60Gf9kb2Aczf21mz6X680MostXwDrqK4Y_8tdhH36ZMQuQT9ygEzNJtUM3_NPazG34sI3hYEHIw7BRGFpjt55TYNy9pew3LmNhOMnc.M2FaEU0hb2fbsS_zqQcWjWNHtTZgVKF0y5gSD2ABI1kwgC82FAq0ShB.eVWYxJAvPVWNKQ2A81M1OJ2nwFj_h1xL4djiBeIX0l.6QwJg4jMQnDe7RwCpd1RdqyHywa1hrPCupXt9nFQiTNXlmxeMQaG8HKHxsxVtw9X7._YrPzpBLaJ9jwH.c3Epu8.9M2cZDHj8f8zTHZG5VhGHCNaO0Sxx2T4; ycj_from_url=aHR0cHM6Ly93d3cueXVuY2FpamluZy5jb20vaW5zaWRlci9zaW1wbGUuaHRtbA%3D%3D; Hm_lpvt_b68ec780c488edc31b70f5dadf4e94f8=1741345319'
        }
    },
    /* eslint quote-props:0 */
    market: {
        '000': 'sz',
        '001': 'sz',
        '002': 'sz',
        '200': 'sz',   // 深圳B股
        '300': 'sz',
        '600': 'sh',
        '601': 'sh',
        '603': 'sh',
        '605': 'sh',
        '900': 'sh',   // 上海B股
    },
    insider: {
        sz: {
            /*深圳交易所地址变更 http://www.szse.cn/disclosure/supervision/change/index.html*/
            url: 'http://www.szse.cn/api/report/ShowReport/data?',
            method: 'GET',
            endKey: 'txtEnd',
            beginKey: 'txtStart',
            codeKey: 'txtDMorJC',
            span: '12m',
            encoding: null,
            timeout: 50000,
            selector: '#REPORTID_tab1',
            headers: {
                Host: 'www.szse.cn',
            },
            catalog: {
                '000': '1801_cxda',              // 深圳主板
                '001': '1801_cxda',              // 深圳主板
                '002': '1801_cxda',             // 深中小企业板
                '300': '1801_cxda',              // 深创业板
            },
            qs: {
                SHOWTYPE: 'JSON',
                CATALOGID: '1801_cxda',
                txtStart: '',                  // 变动开始日期
                txtEnd: '',                    // 变动截止日期
                txtGgxm: '',                   // 董监高姓名
                txtDMorJC: '',                 // 证券代码
                TABKEY: 'tab1',                // 请求返回HTML片断填充的表对应ID后缀，其前缀为‘REPORTID_’，则填充到 "#REPORTID_tab1"
            },
        },
        sh: {
            url: 'http://query.sse.com.cn/commonQuery.do',
            method: 'GET',
            endKey: 'END_DATE',
            beginKey: 'BEGIN_DATE',
            codeKey: 'COMPANY_CODE',
            span: '12m',
            json: true,
            timeout: 50000,
            headers: {
                Host: 'query.sse.com.cn',
                Referer: 'http://www.sse.com.cn/disclosure/listedinfo/credibility/change/',
            },
            qs: {
                jsonCallBack: 'jsonpCallback77077',
                sqlId: 'COMMON_SSE_XXPL_CXJL_SSGSGFBDQK_S',
                isPagination: false,           // 是否分页，默认true
                COMPANY_CODE: '',              // 公司代码
                NAME: '',                      // 董监高姓名
                BEGIN_DATE: '',                // 变动开始日期
                END_DATE: '',                  // 变动截止日期
                'pageHelp.pageSize': 15,       // 分页大小/每页展示的记录数目，默认15
                'pageHelp.cacheSize': 5,       // 每次查询的分页数目，默认5
            },
        },
        'uzfin.com': {
            insider: {
                url: 'http://uzfin.com/api/v1/star',
                method: 'GET',
                json: true,
                timeout: 50000,
                qs: {
                    span: '',    // 1m~6m, 1~30d, 股票代码存在的时候可以不设查询起止时间, 股票代码不存在的时候最多可以查询最近六个月的持股变动数据
                    code: '',    // 需要查询的股票代码，可以为空
                    page: 1,     // 当前查询的分页，默认查询第一页
                    limit: 20,   // 每个分页的记录数目，默认 20
                    market: '',  // 指定市场类型:SZM-深圳主板, SZGEM-深圳创业板, SZSME-深圳中小企业板, SHM-上海主板，可以为空
                    from: '',    // 查询起始时间，可以为空
                    to: '',      // 查询终止时间，可以为空
                },
            },
            top: {
                url: 'http://uzfin.com/api/v1/star/top',
                method: 'GET',
                json: true,
                timeout: 50000,
                qs: {
                    span: '3m',               // query time span:1m~12m
                    order: 'top_buy_value',   // 'top_buy_value' or 'top_sell_value'
                },
            },
        },
    },
    // 默认股票数据文件名
    symbolFile: 'symbols.yaml',
    // 默认配置文件名
    starConfFile: '.star.json',
    // 每次请求的股票数目
    chunkSize: 25,
    // 当前使用数据源
    dataSource: 'TENCENT',
    // 当前页面最多显示股票数目
    limit: 25,
    // 排序方式按星级或者上涨空间排序
    sort: {
        pe: 'pe',
        pb: 'pb',
        star: 'star',
        code: 'code',
        price: 'price',
        targetp: 'pct',
        bdiff: 'bdiff',
        sdiff: 'sdiff',
        incp: 'incPct',
        capacity: 'capacity',
    },
    defaultSort: 'pct',
};

// Number format for numbro
conf.numbro = {
    delimiters: {
        thousands: ',',
        decimal: '.',
    },
    abbreviations: {
        thousand: '千',
        million: '百万',
        billion: '十亿',
        trillion: '兆',
    },
    ordinal: () => '.',
    currency: {
        symbol: '¥',
    },
};

conf.fmt = {
    common: '0,0',
    flot: '0,0.00',
    money: '$ 0,0.00',
    inDate: 'YYYY/MM/DD',
    outDate: 'YYYY-MM-DD',
    cnDate: 'YYYY年MM月DD日',
};