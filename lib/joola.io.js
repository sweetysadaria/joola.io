/**
 *  @title joola.io
 *  @overview the open-source data analytics framework
 *  @copyright Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>
 *
 *  Licensed under GNU General Public License 3.0 or later.
 *  Some rights reserved. See LICENSE, AUTHORS.
 **/

var color = require('colors');

//our base global object
var joola = {};
module.exports = joola;
joola.VERSION = require('./../package.json').version;

joola.sdk = require('joola.io.sdk');

joola.init = function (options, callback) {
  if (typeof callback !== 'function')
    callback = function () {
    };

  //load command line and env variables needed for startup.
  var cli = require('./common/cli');
  if (cli.process()) {
    //the user's args included some terminating ones, such as: version, help
    process.exit(0);
  }

  //setup the process domain, to handle unhandled exceptions
  require('./common/domain');

  //setup the stack
  joola.common = require('./common/index');
  joola.options = joola.common.extend({
    logger: {
      console: {
        level: 'info'
      }
    }
  }, options);
  joola.common.geoip = require('./common/geoip');
  joola.events = require('./common/events');
  joola.config = require('./common/config');
  joola.state = require('./common/state');
  joola.dispatch = require('./dispatch');
  joola.redis = null;
  joola.logger = require('./common/logger');

  joola.auth = require('./auth');

  joola.webserver = require('./webserver');
  joola.mongo = require('./common/mongo');
  joola.memory = require('./common/memory');
  joola.etl = require('./dispatch/beacon').etl;

  joola.ROOT = {
    user: {
      username: 'root',
      workspace: 'root',
      su: true
    }
  };

  joola.UID = joola.common.uuid();

  //setup the main watchers for system management and health
  require('./common/watchers');

  //add global functions
  require('./common/globals');

  //bring the stack online
  joola.config.init(function (err) {
    if (err) {
      console.log('Error starting application. This error occurred while trying to initalize the framework.'.red);
      console.log('Exception details:'.red);
      console.log(err);
      process.exit();
    }

    joola.redis = require('./common/redis')(joola.config.store.runtime.redis);
    joola.dispatch.init(function (err) {
      if (err) {
        console.log('Error starting application. This error occurred while trying to initalize the dispatch sub-system.'.red);
        console.log('Exception details:'.red);
        console.log(err);
        process.exit();
      }

      joola.dispatch.hook();
      joola.logger.debug('Message dispatch online.');

      joola.webserver.start({}, function (err, http) {
        if (err) {
          joola.logger.error('Webserver startup reported an issue, exiting: ' + (typeof(err) === 'object' ? err.message : err));
          callback(new Error('Webserver startup reported an issue, exiting: ' + (typeof(err) === 'object' ? err.message : err)));
          return shutdown(1);
        }

        if (joola.config.get('webserver')) {
          setTimeout(function () {
            joola.logger.debug('Verifying webserver(s)');
            joola.webserver.verify(function (err) {
              if (err) {
                joola.logger.error('Failed to validate webserver(s) are online.');
                callback(new Error('Failed to validate webserver(s) are online.'));
                return shutdown(1);
              }
              else {
                //webserver is live (if it should be)

                //we're live
                joola.logger.info('joola.io version ' + joola.VERSION + ' started [' + joola.UID + '].');

                joola.logger.debug('Webserver(s) verified.');
                joola.events.emit('init:done', joola);
                return callback(null, joola);
              }
            });
          }, 2000);
        }
        else {
          //webserver is live (if it should be)
          //we're live
          joola.logger.info('joola.io version ' + joola.VERSION + ' started [' + joola.UID + '].');

          joola.events.emit('init:done', joola);
          return callback(null, joola);
        }
      });
    });

    //setup REPL for remote management
    // we have a special file that contains a set of global functions designed to be used by REPL.
    // NOTE: this option should be only used for debug/development and can be used as a back-door.
    if (joola.config.get('repl'))
      require('./common/repl');

  });

  //This will be fired when the init part is done.
  joola.events.on('init:done', function () {
    //let's check the state of the cache and if we need to build it.
    joola.state.set('core', 'online', 'init complete');
  });

  //This will respond to any global state changes (i.e. system online, offline)
  joola.state.on('state:change', function (state) {

  });
};

