/**
 *  @title joola.io
 *  @overview the open-source data analytics framework
 *  @copyright Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>
 *
 *  Licensed under GNU General Public License 3.0 or later.
 *  Some rights reserved. See LICENSE, AUTHORS.
 **/

var
  joola = require('../joola.io'),

  async = require('async'),
  path = require('path'),
  nconf = require('nconf');

require('nconf-redis');

module.exports = nconf;

nconf.argv()
  .env();

var onlyonce = false;

nconf.init = function (callback) {
  var options = {
    redis: {}
  };

  nconf.options = options;

  /* istanbul ignore next */
  options.redis = {
    namespace: 'config',
    ttl: 30000,
    connect: function () {
      joola.logger.debug('[config-redis] Connected to redis @ ' + options.redis.host + ':' + options.redis.port + '#' + options.redis.db);
      joola.state.set('config-redis', 'working', 'redis [config-redis] is up.');
    },
    error: function (err) {
      joola.state.set('config-redis', 'failure', 'redis [config-redis] is down: ' + (typeof(err) === 'object' ? err.message : err));
    }
  };

  var configPath;
  if (process.env.JOOLA_CONFIG_PATH)
    configPath = process.env.JOOLA_CONFIG_PATH;
  else
    configPath = path.join(__dirname, '../../config/baseline.json');
  //we don't have a valid redis store yet, let's find a config file.
  try {
    var earlyConfig = require(configPath);
    if (earlyConfig) {
      options.redis.host = earlyConfig.store.config.redis.host;
      options.redis.port = earlyConfig.store.config.redis.port;
      options.redis.db = earlyConfig.store.config.redis.db || 0;
      options.redis.auth = earlyConfig.store.config.redis.auth;
    }
  }
  catch (ex) {
  }


  /* istanbul ignore if */
  if (options.redis.host === null || options.redis.port === null || options.redis.db === null) {
    //we still don't have any valid redis config.
    return callback(new Error('Failed to find a valid config file [' + configPath + '].'));
  }
  else
    joola.logger.silly('Loaded configuration from [' + configPath + ']');

  joola.config.use('redis', options.redis);
  joola.config.redis = joola.config.stores.redis.redis;

  nconf.validate(configPath, function (err) {
    if (err)
      return callback(err);
    joola.config.populate(null, callback);

    //override set
    if (!joola.config._set)
      joola.config._set = joola.config.set.clone();
    joola.config.set = function (key, value, expire, callback) {
      if (typeof expire === 'function') {
        callback = expire;
        expire = null;
      }
      /* istanbul ignore next */
      callback = callback || emptyfunc;
      //joola.config.clear(key, function (err) {
      /* istanbul ignore if */
      // if (err)
      //  return callback(err);
      joola.config._set(key, value, function (err) {
        /* istanbul ignore if */
        if (err)
          return callback(err);

        if (joola.dispatch)
          joola.dispatch.emit('config:change', key);
        if (expire)
          joola.config.redis.expire('config:' + key, expire);
        return callback(null);
      });
      //});
    };
  });

  //override get
  nconf._get = nconf.get.clone();
  nconf.get = function (key, callback) {
    if (typeof callback === 'function') {
      nconf._get(key, function (err, value) {
        if (value && typeof value === 'object') {
          Object.keys(value).forEach(function (key) {
            var highLevelObject = value[key];
            if (value[key] && typeof value[key] === 'object') {
              Object.keys(highLevelObject).forEach(function (innerKey) {
                if (typeof highLevelObject[innerKey] === 'undefined') {
                  highLevelObject[innerKey] = null;
                }
              });
            }
          });
        }
        return callback(null, value);
      });
    }
    else
      return nconf._get(key);
  };

  //hook events
  joola.events.on('dispatch:ready', function () {
    joola.dispatch.on('config:change', function (message, key) {
      //if (err)
      //  joola.logger.error('Error while changing configuration deteched: ' + (typeof(err) === 'object' ? err.message : err));
      joola.config.populate(key, function (err) {
        joola.logger.debug('Cache store refreshed due to a change.');
      });
    });
  });
};

nconf.validate = function (configPath, callback) {
  var rawConfig;
  try {
    rawConfig = require(configPath);
  }
  catch (ex) {
    return callback(ex);
  }
  //check that we have a valid configuration
  joola.config.redis.get('config:_version', function (err, value) {
    /* istanbul ignore if */
    if (err)
      return callback(err);

    if (!value) {
      joola.logger.warn('Found an empty configuration store, building initial...');

      nconf.file({ file: configPath });

      var expected = Object.keys(rawConfig).length;
      var counter = 0;
      Object.keys(rawConfig).forEach(function (key) {
        joola.config.set(key, rawConfig[key], function () {
          counter++;
          if (expected == counter) {
            //hash passwords

            var calls = [];
            joola.config.get('workspaces', function (err, works) {
              var expected = 0;
              Object.keys(works).forEach(function (work) {
                expected++;
                joola.config.get('workspaces:' + work + ':users', function (err, values) {
                  if (values) {
                    Object.keys(values).forEach(function (user) {
                      user = values[user];

                      if (user._password == rawConfig.workspaces[work].users[user.username]._password) {
                        var call = function (callback) {
                          var hash = joola.auth.hashPassword(user._password);
                          joola.config.set('workspaces:' + work + ':users:' + user.username + ':_password', hash, callback);
                          user._password = hash;
                        };
                        calls.push(call);
                      }
                    });
                  }
                  async.series(calls, function (err) {
                    expected--;
                    if (expected === 0)
                      return callback(null);
                  });
                });
              });
            });
            //return callback(null);
          }
        });
      });
      joola.config.set('version', rawConfig._version);

    }
    else {
      joola.logger.silly('Found a valid configuration store.');
      return callback(null);
    }
  });
};

nconf.populate = function (key, callback) {
  var scope = nconf.stores.redis.namespace + ':keys';
  if (key)
    scope = key;
  joola.config.redis.smembers(scope, function (err, keys) {
    /* istanbul ignore if */
    if (err)
      return callback(err);

    var counter = 0, expected = keys.length;
    /* istanbul ignore if */
    if (expected === 0) {
      joola.config.get(key, function (err, value) {
        var setObjByString = function (obj, str, val) {
          var keys, key;
          //make sure str is a string with length
          if (!str || !str.length || Object.prototype.toString.call(str) !== "[object String]") {
            return false;
          }
          if (obj !== Object(obj)) {
            //if it's not an object, make it one
            obj = {};
          }
          keys = str.split(':');
          while (keys.length > 1) {
            key = keys.shift();
            if (obj !== Object(obj)) {
              //if it's not an object, make it one
              obj = {};
            }
            if (!(key in obj)) {
              //if obj doesn't contain the key, add it and set it to an empty object
              obj[key] = {};
            }
            obj = obj[key];
          }
          if (obj)
            obj[keys[0]] = val;
        };
        setObjByString(joola.config, key, value);

        return callback(null);
      });
    }
    keys.forEach(function (key) {
      joola.config.get(key, function (err, value) {
        counter++;
        //delete joola.config[key];
        joola.config[key] = value;
        if (counter == expected) {
          joola.events.emit('config:done');
          return callback(null);
        }
      });
    });
  });
};