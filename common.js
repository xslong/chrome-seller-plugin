/**

 xslong@live.com
 2017/8/8
 */

/**
 * 用chrome.storage实现的自动事件
 *
 *  可实现popup、background、content页面发送事件监听
 * @type {{isInit: boolean, listened: {}, init: CC.init, triggerAction: CC.triggerAction, addListener: CC.addListener}}
 */
var CC = {
    isInit: false,
    listened: {},
    init: function () {
        if (this.isInit) return this;
        this.isInit = true;
        var $this = this;
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            if (changes['action']) {
                var action = changes['action'].newValue;
                var listeners = $this.listened[action.code];
                if (listeners) {
                    for (var i = 0; i < listeners.length; i++) {
                        listeners[i](action.code,action.data);
                    }
                }
            }
        });
        return $this;
    },
    /**
     * 触发事件
     * @param code 事件代码
     * @param data 传输的数据
     * @returns {CC}
     */
    triggerAction: function triggerAction(code, data) {
        if (!this.isInit) throw 'Not initialized : init()';
        chrome.storage.local.set({
            'action': {
                code: code,
                data: data,
                $t: (new Date()).getTime()
            }
        }, function () {
        });
        return this;
    },
    /**
     * 对code绑定监听器
     * @param code 事件代码
     * @param listener (code,data) 监听器，可接收数据
     * @returns {CC}
     */
    addListener: function (code, listener) {
        if (!this.isInit) throw 'Not initialized : init()';
        if (this.listened[code])
            this.listened[code].push(listener);
        else
            this.listened[code] = [listener];
        return this;
    }
}

/**
 * 日期处理
 * @type {{dateFormat: string, intervalDay: DU.intervalDay, diffDay: DU.diffDay, min: DU.min, parse: DU.parse, format: DU.format}}
 */
var DU = {
    dateFormat: 'dd/mm/yy',
    intervalDay: function (dateStr, intervalDay) {
        var d = this.parse(dateStr);
        d.setDate(d.getDate() + intervalDay);
        return this.format(d);
    },
    diffDay: function (dateStr1, dateStr2) {
        var d1 = this.parse(dateStr1), d2 = this.parse(dateStr2);
        return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
    },
    min: function (dateStr1, dateStr2) {
        return this.diffDay(dateStr1, dateStr2) <= 0 ? dateStr1 : dateStr2;
    },
    parse: function (dateStr, fmt) {
        fmt = fmt || this.dateFormat;
        switch (fmt) {
            case 'dd/mm/yy':
                var dp = dateStr.split("/");
                return new Date(dp[2], (parseInt(dp[1]) - 1), dp[0]);
            case ('m/d/y'):
                var dp = dateStr.split("/");
                return new Date(parseInt(dp[2]) + 2000, (parseInt(dp[0]) - 1), dp[1]);
            case ('yyyy-mm-dd'):
                var dp = dateStr.split("-");
                return new Date(dp[0], (parseInt(dp[1]) - 1), dp[2]);
        }
        return new Date(dateStr);

    },
    /**
     *  dd/mm/yy: 01/03/2016   m/d/y: 3/1/16
     *
     */
    format: function (d, fmt) {
        fmt = fmt || this.dateFormat;
        switch (fmt) {
            case 'dd/mm/yy':
                return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
            case 'm/d/y':
                return (d.getMonth() + 1) + "/" + d.getDate() + "/" + (d.getFullYear() % 2000);
            case 'yyyy-mm-dd':
                return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
        }
        return d;
    }
};


JSON.stringify = JSON.stringify || function (obj) {
    var t = typeof (obj);
    if (t != "object" || obj === null) {
        // simple data type
        if (t == "string") obj = '"' + obj + '"';
        return String(obj);
    }
    else {
        // recurse array or object
        var n, v, json = [], arr = (obj && obj.constructor == Array);
        for (n in obj) {
            v = obj[n];
            t = typeof (v);
            if (t == "string") v = '"' + v + '"';
            else if (t == "object" && v !== null) v = JSON.stringify(v);
            json.push((arr ? "" : '"' + n + '":') + String(v));
        }
        return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
    }
};


function getCookie(name) {
    match = document.cookie.match(new RegExp(name + '=([^;]+)'));
    if (match) return unescape(match[1]);
}

function setCookie(name, value, expiredays) {
    var exdate = new Date()
    exdate.setDate(exdate.getDate() + expiredays)
    document.cookie = name + "=" + escape(value) +
        ((expiredays == null) ? "" : ";expires=" + exdate.toGMTString())
}

/**
 * 取站点
 * @returns {*}
 */
function getDomain() {
    var domain = document.domain;
    return domain.split('.amazon.')[1];
}

function getValue(str) {
    if (str) {
        var arr = str.split(/=|:/);
        if (arr.length > 1)
            return arr[1].trim();
    }
    return str;
}

function getQueryValue(field, url) {
    var href = url ? url : window.location.href;
    var reg = new RegExp('[?&]' + field + '=([^&#]*)', 'i');
    var string = reg.exec(href);
    return string ? decodeURIComponent(string[1]) : null;
}
