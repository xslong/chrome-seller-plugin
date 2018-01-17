var activeAmazon = {};

//点插件触发

/*
chrome.browserAction.onClicked.addListener(function (activeTab) {
});
*/

/**
 domain
 command:
 new_page    新打开页面
 post_order    提交数据
 */

var DEFAULT_CONFIG = {
    startDate: '2016-01-01',
    interval: 15,
    dateRange: 2,
    autoLogin: false,
    account: '',
    password: ''
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.info("message :%o command:%s", request, request.command);
    if ('new_page' == request.command) {
        if (activeAmazon[request.domain] == null) {
            hasOpenOrderPage(request.domain, function (b) {
                if (!b) {
                    var orderUrl = "https://sellercentral.amazon." + request.domain + "/gp/orders-v2/list/ref=ag_myo_reset_myo?ie=UTF8&clearAllFilters=1&language=en_US&__s";
                    // chrome.tabs.create({ url: orderUrl });
                    chrome.windows.create({'url': orderUrl}, function (window) {
                    });
                }
            });
        }
    } else if ("post_order" == request.command) {
        console.info("POST> currentPage:%s, size:%s", request.currentPage, request.orders.length);
        $.ajax({
            url: "http://xxxxxxx/crawl/api/order/add",
            type: 'POST',
            data: JSON.stringify(request),
            dataType: 'json',
            contentType: 'application/json',
            success: function (data, status, xhr) {
                console.info(data);
            },
            error: function (xhr, error, exception) {
                console.info(error || exception);
            }
        });
    } else if ("set_config" == request.command) {
        var key = chrome.runtime.id;
        var ciphertext = CryptoJS.AES.encrypt(JSON.stringify(request.config), key);
        localStorage["soh_form"] = ciphertext;
    } else if ("get_config" == request.command) {
        var key = chrome.runtime.id;
        var ciphertext = localStorage["soh_form"];
        if (ciphertext != null) {
            var plaintext = CryptoJS.AES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8);
            sendResponse(JSON.parse(plaintext));
        } else {
            sendResponse(DEFAULT_CONFIG);
        }
    }

});

function hasOpenOrderPage(domain, callback) {
    chrome.tabs.query({}, function (tabs) {
        var b = false;
        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].url.indexOf("sellercentral.amazon." + domain + "/gp/orders-v2/") != -1) {
                b = true;
                break;
            }
        }
        if (typeof callback === 'function')
            callback(b);
    });
}
