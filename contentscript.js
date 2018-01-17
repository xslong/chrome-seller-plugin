/**
 自动登录 & 自动爬取订单
 xslong@live.com
 2017/8/8
 */

setTimeout(function () {
    if (location.href.indexOf('sellercentral.amazon.') == -1)
        return;
    chrome.extension.sendMessage({command: 'get_config'}, function (response) {
        mainFun(response);
    });
}, 2000);

function mainFun(config) {

    CC.init().addListener('startDateReset', function () {
        console.info('Reset the start date');
        localStorage["startDateReset"] = true;
    });

    var domain = getDomain();

    //自动登录
    if (location.href.indexOf('https://sellercentral.amazon.' + domain + '/ap/signin') != -1) {
        if (config.autoLogin === true) {
            if ($('#message-box-slot > .message:visible').length == 0 && $('#ap_captcha_img').length == 0) {
                $('#ap_email').val(config.account);
                $('#ap_password').val(config.password);
                $('#signInSubmit').click();
            }
        }
        return;
    }

    if (location.href.indexOf('ap/signin?') != -1)
        return;

    var sellerId = localStorage["takt_user_id"];

    console.info("x-main:%s", getCookie('x-main'));
    console.info("x-acbuk:%s", getCookie('x-acbuk'));
    console.info("takt_user_id:%s", sellerId);

    if (!getCookie('x-main')    /*com*/
        && !getCookie('x-acbuk')/*co.uk*/
        && !getCookie('x-acbca')/*ca*/
    ) {
        return;
    }

    chrome.runtime.sendMessage({command: 'new_page', domain: domain, sellerId: sellerId});

    if (location.href.indexOf('__s') == -1 && location.href.indexOf('__r') == -1) {
        return;
    }

    DU.dateFormat = $('form.myo_list_orders_search_form input[jqdateformat]:first').attr('jqdateformat');
    console.info("DU.dateFormat:%s", DU.dateFormat);

    //订单页面
    document.title = '！！！不要关闭！！！';

    (function () {
        console.info(new Date(), "---- start crawling the order ----");

        if (localStorage["startDateReset"]) {

            delete localStorage["startDateReset"];
            delete localStorage["dateRangeStart"];
            delete localStorage["dateQueryStart"];

            var orderUrl = "https://sellercentral.amazon." + domain + "/gp/orders-v2/list/ref=ag_myo_reset_myo?ie=UTF8&clearAllFilters=1&language=en_US&__s";
            location.href = orderUrl;
            return;
        }

        var defaultStart = DU.parse(config.startDate, 'yyyy-mm-dd');

        var dateRangeStart = localStorage["dateRangeStart"] || DU.format(defaultStart);
        var dateRangeEnd = DU.format(new Date());

        localStorage["dateRangeStart"] = dateRangeStart;

        var intervalDay = parseInt(config.dateRange);

        var dateQueryStart = getQueryValue("exactDateBegin") || localStorage["dateQueryStart"] || dateRangeStart;
        var dateQueryEnd = DU.min(dateRangeEnd, DU.intervalDay(dateQueryStart, intervalDay));

        localStorage["dateQueryStart"] = dateQueryStart;

        if (location.href.indexOf('__s') != -1) {
            startCollect(dateQueryStart, dateQueryEnd);
            return;
        }
        if (location.href.indexOf('__r') != -1) {
            setTimeout(function () {
                collectOrder();
                var nextBtn = $('#myo-table .tiny a.myo_list_orders_link:contains(Next):first');
                if (nextBtn.length != 0) {
                    location.href = $(nextBtn).attr('href') + "&__r";
                } else {
                    dateQueryStart = DU.intervalDay(dateQueryEnd, 1);
                    if (DU.diffDay(dateQueryStart, dateRangeEnd) > 0) {
                        //今天最后一页,然后一直循环
                        dateQueryStart = DU.intervalDay(DU.format(new Date()), -intervalDay);
                    }
                    dateQueryEnd = DU.min(dateRangeEnd, DU.intervalDay(dateQueryStart, intervalDay));
                    localStorage["dateQueryStart"] = dateQueryStart;
                    startCollect(dateQueryStart, dateQueryEnd);
                }
            }, parseInt(config.interval) * 1000);
        }
    })();

    function startCollect(dateQueryStart, dateQueryEnd) {
        var queryUrl = "https://sellercentral.amazon." + domain + "/gp/orders-v2/list?ie=UTF8"
            + "&byDate=orderDate"
            + "&currentPage=1"
            + "&exactDateBegin=" + encodeURIComponent(dateQueryStart)  // 8/8/17
            + "&exactDateEnd=" + encodeURIComponent(dateQueryEnd)  //
            + "&searchType=DateRange"
            + "&isSearch=1"
            + "&itemsPerPage=50"
            + "&orderType=All"
            + "&paymentFilter=Default"
            + "&preSelectedRange=exactDates"
            + "&searchDateOption=exactDates"
            + "&searchFulfillers=all"
            //            + "&searchLanguage=en_US"
            + "&showCancelled=1"
            + "&showPending=1"
            + "&statusFilter=Default"
            + "&__r";
        location.href = queryUrl;
    }

    function collectOrder() {
        var orders = [];
        $('#myo-table > table tr.order-row').each(function (idx) {
            console.info($(this).find('input.order-id').val());
            var order = {
                sellerId: sellerId,
                domain: domain,

                order_id: $(this).find('input.order-id').val(),
                es_level: $(this).find('input.es-level').val(),
                num_shipped: $(this).find('input.num-shipped').val(),
                cust_id: $(this).find('input.cust-id').val(),
                merch_fulfilled: $(this).find('input.merch-fulfilled').val(),
                marketplace_id: $(this).find('input.marketplace-id').val(),
                fulfillmentServiceLevel: $(this).find('input.fulfillmentServiceLevel').val(),
                latestShipDate: $(this).find('input.latestShipDate').val(),
                isPrime: $(this).find('input.isPrime').val(),
                numberOfItemsRemainingToShip: $(this).find('input.numberOfItemsRemainingToShip').val(),
                date: $(this).find('td:eq(1)').text().trim(),

                shipping: $(this).find('> td:eq(3)').text().trim(),
                status: $(this).find('> td:eq(4) .alert').length == 0 ? $(this).find('> td:eq(4)').text().trim() : $(this).find('> td:eq(4) .alert').text()
            };
            order.details = [];
            $(this).find("td:eq(2) table").each(function (idx) {
                var rows = $(this).find('tr');
                if (rows.length >= 2) {
                    var d = $(rows[1]).find('td');
                    var item = {
                        title: $(rows[0]).text().trim(),
                        qty: getValue($(d[0]).text()),
                        asin: $(rows[1]).find('span[id$=__asin]').text(),
                        sku: $(rows[1]).find('span[id$=__sku]').text(),
                    }
                }
                order.details.push(item);
            });

            var bd = $(this).find("td:eq(2) > div:last-child");
            order.buyerName = getValue($(bd.find('a[id$=_buyerName]')).text());
            order.contactBuyerUrl = $(bd.find('a[id$=_buyerName]')).attr("href")
            order.salesChannel = getValue($(bd.find("div:contains(Sales Channel)")).text());
            order.fulfillmentMethod = getValue($(bd.find("div:contains(Fulfillment method)")).text());
            order.billingCountry = getValue($(bd.find("div:contains(Billing Country)")).text());
            orders.push(order);
        });
        if (orders.length > 0) {
            var currentPage = $('#myo-table .tiny strong.currentpagination:first').text();
            chrome.runtime.sendMessage({command: 'post_order', orders: orders, currentPage: currentPage});
        }
        return orders;
    }

};
