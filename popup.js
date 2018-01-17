/**
 配置
 xslong@live.com
 2017/8/8
 */
document.addEventListener('DOMContentLoaded', function () {

    CC.init();

    chrome.extension.sendMessage({command: 'get_config'}, function (response) {
        $('input').map(function () {
            if (response[this.id]) {
                if (this.type === 'checkbox') {
                    $(this).attr("checked", true);
                } else {
                    this.value = response[this.id];
                }
            }
        });
    });

    $('#save').click(function () {
        var form = {create: new Date()};
        $('input').map(function () {
                if (this.type === 'checkbox') {
                    form[this.id] = $(this).is(":checked");
                } else {
                    form[this.id] = this.value;
                }
            }
        );
        chrome.runtime.sendMessage({command: 'set_config', config: form});
        window.close();
    });

    $('#startDateReset').click(function () {
        CC.triggerAction('startDateReset');
    });

});







