// Smart Hub Preview service.
// The app launches this service with the preview JSON (New Episodes, Continue Watching...)
// and it hands that JSON to the TV, which shows it as tiles above the app icon on the home bar.
// When the TV starts the service on its own (about every 10 minutes) there is no new data,
// so it exits and the last preview stays on screen.

function getWebapis() {
    if (typeof webapis !== 'undefined') return webapis;
    try { return require('$WEBAPIS/webapis/webapis.js'); } catch (e) {}
    return null;
}

// Tell the app what happened (shown briefly on screen while we confirm this works on the TV)
function report(msg) {
    try {
        var port = tizen.messageport.requestRemoteMessagePort('tL8G1A0X4A.AryPlusTV', 'ARY_PREVIEW');
        port.sendMessage([{ key: 'status', value: String(msg) }]);
    } catch (e) {}
}

function finish() {
    try { tizen.application.getCurrentApplication().exit(); } catch (e) {}
}

module.exports.onStart = function () {};

module.exports.onRequest = function () {
    var json = null;
    try {
        var data = tizen.application.getCurrentApplication().getRequestedAppControl().appControl.data || [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].key === 'preview' && data[i].value && data[i].value[0]) json = data[i].value[0];
        }
    } catch (e) {}

    if (!json) { finish(); return; }
    var api = getWebapis();
    if (!api) { report('service: webapis not available'); finish(); return; }
    if (!api.preview) { report('service: preview API not available'); finish(); return; }
    try {
        api.preview.setPreviewData(json, function () {
            finish();
        }, function (e) {
            report('TV rejected the tiles: ' + (e && (e.name + ' ' + e.message)));
            finish();
        });
    } catch (e) {
        report('service error: ' + e);
        finish();
    }
};

module.exports.onExit = function () {};
