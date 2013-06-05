var remote = require('./remote_debugger'),
    ADB = require('adb').DebugBridge;

var FFOS_Cli = function FFOS_Cli() {

  var config;
  var adb = new ADB();

  var configure = function configure(json) {
    config = json;
  };

  // Start displaying the logcat for the first device we find
  var logcat = function logcat() {
    adb.traceDevice(function onDevices(devices) {
      if (!devices || devices.length == 0) {
        return;
      }
      devices[0].logcat();
    });
  };

  // Takes a screenshot from device if any, pass a file name
  // and a callback to know when we finished.
  // The callback expected 1 parameter, in case an error
  // happened
  var screenshot = function screenshot(fileName, callback) {
    adb.traceDevice(function onDevices(devices) {
      if (!devices || devices.length == 0) {
        callback('No devices');
      }
      var device = devices[0];
      try {
        device.takeSnapshot(function onSnapshot(frame) {
          frame.writeImageFile(fileName);
          callback(null);
        });
      } catch (e) {
        callback(e);
      }
    });
  };

  /*
    For installing an app just follow the steps:
    1.- Forward the remote debugger port (use config if present)
    2.- Upload the selected zip file to the app id
    3.- Use the remote client to tell the system to install the app
  */
  var installApp = function installApp (appId, localZip, appType, callback) {
    var localPort = remotePort = 'tcp:6000';
    if (config && config.localPort && config.remotePort) {
      localPort = config.localPort;
      remotePort = config.remotePort;
    }

    adb.forward(localPort, remotePort, function onForward() {
      //Build the remote url with the appId
      var remoteFile = '/data/local/tmp/b2g/' + appId + '/application.zip';
      pushFile(localZip, remoteFile, function onPushed(err, success) {
        if (err) {
          callback(err);
          return;
        }

        installRemote(remotePort, appId, appType, callback);
      });
    });

  };

  // Uses the remote protocol to tell the system to install an app
  // previously uploaded
  var installRemote = function installRemote(remotePort, appId, appType, cb) {
    remote.init(remotePort.split(':')[1]);
    remote.installApp(appId, appType, function onInstall(err, data) {
      if (err) {
        cb(err);
        return;
      }
      cb(null, data);
    });
  };

  // Push a local file to a remote location on the phone
  var pushFile = function pushFile(local, remote, callback) {
    adb.traceDevice(function onDevices(devices) {
      // Work with the first device we found, if any
      if (!devices || devices.length == 0) {
        callback('No devices found');
        return;
      }
      var device = devices[0];

      device.getSyncService(function onSyncService(sync) {
        sync.pushFile(local, remote, callback);
      });
    });
  };

  return {
    'config': config,
    'logcat': logcat,
    'screenshot': screenshot,
    'installApp': installApp
  };

}();

module.exports = FFOS_Cli;