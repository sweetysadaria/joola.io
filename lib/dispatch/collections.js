/**
 *  @title joola.io/lib/dispatch/collections
 *  @overview Provides collection management as part of the framework data mapping.
 *  @description
 *  joola.io uses the concept of `collections` to organize documents into logical sections.
 *  Collections include definitions on metrics, dimensions and other attributes. that instruct joola.io on how to
 *  translate the collection's data into insight
 *
 *  Collections are part of the [Dispatch sub-system]() and can be access from both the server and client side, via
 *  `joolaio.collections`.
 *
 *   For more information about collections, please refer to this [section]()
 *   For additional information about the `dispatch` subsystem, please see this [section]()
 *
 * - [list](#list)
 * - [get](#get)
 * - [add](#add)
 * - [update](#update)
 * - [delete](#delete)
 * - [stats](#stats)
 * - [maxdate](#maxdate)
 * - [mindate](#mindate)
 *
 *  @copyright (c) Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>. Some rights reserved. See LICENSE, AUTHORS
 **/
var
  router = require('../webserver/routes/index'),
  Proto = require('./prototypes/collection');

/**
 * @function list
 * @param {Function} [callback] called following execution with errors and results.
 * Lists all defined collections:
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the list of configured collections.
 *
 * Configuration elements participating: `config:datamap:collections`.
 *
 * Events raised via `dispatch`: `collections:list-request`, `collections:list-done`
 *
 * ```js
 * joola.collections.list(function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.list = {
  name: "/api/collections/list",
  description: "I list all available collections",
  inputs: [],
  _outputExample: {},
  _permission: ['manage_system'],
  _dispatch: {
    message: 'collections:list'
  },
  run: function (context, callback) {
    callback = callback || emptyfunc;
    joola.config.get('datamap:collections', function (err, value) {
      if (err) {
        return callback(err);
      }

      if (typeof value === 'undefined')
        value = {};

      return callback(null, value);
    });
  }
};

/**
 * @function get
 * @param {string} id holds the id of the collection to get.
 * @param {Function} [callback] called following execution with errors and results.
 * Gets a specific collection by id:
 * - `id` of the collection
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the requested collection.
 *
 * Configuration elements participating: `config:datamap:collections`.
 *
 * Events raised via `dispatch`: `collections:get-request`, `collections:get-done`
 *
 * ```js
 * joola.collections.get('dummyCollection', function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.get = {
  name: "/api/collections/get",
  description: "I get a specific collection by id`",
  inputs: ['id'],
  _outputExample: {},
  _permission: ['manage_system'],
  _dispatch: {
    message: 'collections:get'
  },
  run: function (context, id, callback) {
    callback = callback || emptyfunc;
    joola.config.get('datamap:collections:' + id, function (err, value) {
      if (err)
        return callback(err);

      if (typeof value === 'undefined')
        return callback(new Error('collections [' + id + '] does not exist.'));

      return callback(null, value);
    });
  }
};

/**
 * @function add
 * @param {Object} options describes the new collection
 * @param {Function} [callback] called following execution with errors and results.
 * Adds a new collection described in `options`:
 * - `id` of the new collection.
 * - `name` of the new collection.
 * - `type` of the new collection (data/lookup).
 * - `description` of the new collection.
 * - `dimensions` contained in the new collection.
 * - `metrics` contained in the new collection.
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the newly added collection object.
 *
 * Configuration elements participating: `config:datamap:collections`.
 *
 * Events raised via `dispatch`: `collections:add-request`, `collections:add-done`
 *
 * ```js
 * var newCollection = {
 *   id: 'dummyCollection', 
 *   name: 'Dummy Collection',
 *   description: 'Dummy Collection for docs',
 *   type: 'data',
 *   dimensions: {
 *     timestamp: {
 *       id: 'timestamp',
 *       name: 'Date',
 *       mapto: 'timestamp'
 *     }
 *   },
 *   metrics: {
 *     visits: {
 *       id: 'visits',
 *       Name: 'Visits',
 *       type: 'int',
 *       aggregation: 'sum'
 *     }
 *   }
 * };
 *
 * joola.collections.add(newCollection, function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.add = {
  name: "/api/collections/add",
  description: "I add a new collection",
  inputs: ['collection'],
  _outputExample: {},
  _permission: ['manage_system'],
  _dispatch: {
    message: 'collections:add'
  },
  run: function (context, collection, callback) {
    callback = callback || emptyfunc;
    try {
      collection = new Proto(collection);
    } catch (ex) {
      return callback(ex);
    }

    joola.config.get('datamap:collections', function (err, value) {
      if (err)
        return callback(err);

      var _collections;
      if (!value)
        _collections = {};
      else
        _collections = value;

      if (_collections[collection.id])
        return callback(new Error('A collection with name [' + collection.id + '] already exists.'));

      _collections[collection.id] = collection;
      joola.config.set('datamap:collections', _collections, function (err) {
        if (err)
          return callback(err);

        return callback(err, collection);
      });
    });
  }
};

/**
 * @function update
 * @param {Object} options describes the collection to update and the new details
 * @param {Function} [callback] called following execution with errors and results.
 * Updates an existing user described in `options`:
 * - `id` of the collection to be updated (cannot be changed).
 * - `name` to update for the existing collection.
 * - `type` to update for the existing collection.
 * - `description` to update for the existing collection.
 * - `dimensions` to update for the existing collection.
 * - `metrics` to update for the existing collection.
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the updated collection.
 *
 * Configuration elements participating: `config:datamap:collections`.
 *
 * Events raised via `dispatch`: `collection:update-request`, `collection:update-done`
 *
 * ```js
 * var collectionToUpdate = {
 *   id: 'dummyCollection', 
 *   name: 'Dummy Collection - updated',
 *   description: 'Dummy Collection for docs - updated',
 * };
 *
 * joola.collections.update(collectionToUpdate, function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.update = {
  name: "/api/collections/update",
  description: "I update an existing collection",
  inputs: ['collection'],
  _outputExample: {},
  _permission: ['manage_system'],
  _dispatch: {
    message: 'collections:update'
  },
  run: function (context, collection, callback) {
    callback = callback || emptyfunc;

    try {
      collection = new Proto(collection);
    } catch (ex) {
      return callback(ex);
    }

    joola.config.get('datamap:collections', function (err, value) {
      if (err)
        return callback(err);

      var _collections;
      if (!value)
        _collections = {};
      else
        _collections = value;

      if (!_collections.hasOwnProperty(collection.id))
        return callback(new Error('collection with name [' + collection.id + '] does not exist.'));
      _collections[collection.id] = org;
      joola.config.set('datamap:collections', _collections, function (err) {
        if (err)
          return callback(err);

        return callback(err, collection);
      });
    });
  }
};

/**
 * @function delete
 * @param {string} id holds the id of the collection to get.
 * @param {Function} [callback] called following execution with errors and results.
 * Gets a specific collection by id:
 * - `id` of the collection to delete
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the deleted collection.
 *
 * Configuration elements participating: `config:authentication:organizations`.
 *
 * Events raised via `dispatch`: `collections:delete-request`, `collections:delete-done`
 *
 * ```js
 * joola.collections.delete('dummyCollection', function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.delete = {
  name: "/api/collections/delete",
  description: "I delete an existing collection",
  inputs: ['id'],
  _outputExample: {},
  _permission: ['manage_system'],
  _dispatch: {
    message: 'collections:delete'
  },
  run: function (context, id, callback) {
    callback = callback || emptyfunc;

    exports.get.run(context, id, function (err, value) {
      if (err)
        return callback(err);

      joola.config.clear('datamap:collections:' + id, function (err) {
        if (err)
          return callback(err);

        joola.config.get('datamap:collections:' + id, function (err, value) {
          if (err)
            return callback(err);
          if (!value || !value.hasOwnProperty('id'))
            return callback(null, id);

          return callback(new Error('Failed to delete collection [' + id + '].'));
        });
      });
    });
  }
};


/**
 * @function stats
 * @param {string} id holds the id of the collection to get stats for.
 * @param {Function} [callback] called following execution with errors and results.
 * Gets a all known statistics for a collection, including size, number of documents, indexes and more:
 * - `id` of the collection to get stats for
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the collection's statistics.
 *
 * Configuration elements participating: `config:datamap:collections`.
 *
 * Events raised via `dispatch`: `collections:stats-request`, `collections:stats-done`
 *
 * ```js
 * joola.collections.stats('dummyCollection', function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.stats = {
  name: "/api/collections/stats",
  description: "I provide stats about a collection",
  inputs: ['id'],
  _outputExample: {},
  _permission: ['manage_system'],
  _dispatch: {
    message: 'collections:stats'
  },
  run: function (context, id, callback) {
    callback = callback || emptyfunc;

    exports.get.run(context, id, function (err, value) {
      if (err)
        return callback(err);

      joola.mongo.collection('cache', id, function (err, collection) {
        collection.stats(callback);
      });
    });
  }
};

/**
 * @function maxdate
 * @param {string} id holds the id of the collection to check.
 * @param {string} [key] the name of the cache column to check the max date on.
 * @param {Function} [callback] called following execution with errors and results.
 * Gets a specific collection min date by id and optional key:
 * - `id` of the collection to get min date for
 * - `key` name of the column to check max date on
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the max date of the collection.
 *
 * Configuration elements participating: `config:datamap:collections`.
 *
 * Events raised via `dispatch`: `collections:maxdate-request`, `collections:maxdate-done`
 *
 * ```js
 * joola.collections.maxdate('dummyCollection', function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.maxdate = {
  name: "/api/collections/maxdate",
  description: "I provide the maximum date available in the collection",
  inputs: {
    required: ['id'],
    optional: ['key']
  },
  _outputExample: {},
  _permission: ['manage_system'],
  _dispatch: {
    message: 'collections:maxdate'
  },
  run: function (context, id, key, callback) {
    if (typeof key === 'function') {
      callback = key;
      key = null;
    }

    exports.get.run(context, id, function (err, value) {
      if (err)
        return callback(err);

      var sortKey = {};
      sortKey[key ? key : 'timestamp'] = -1;
      joola.mongo.find('cache', id, {}, {limit: 1, sort: sortKey}, function (err, result) {
        if (err)
          return callback(err);

        return callback(null, result && result[0] && result[0].timestamp ? new Date(result[0].timestamp) : null);
      });
    });
  }
};

/**
 * @function mindate
 * @param {string} id holds the id of the collection to check.
 * @param {string} [key] the name of the cache column to check the min date on.
 * @param {Function} [callback] called following execution with errors and results.
 * Gets a specific collection min date by id and optional key:
 * - `id` of the collection to get min date for
 * - `key` name of the column to check min date on
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the min date of the collection.
 *
 * Configuration elements participating: `config:datamap:collections`.
 *
 * Events raised via `dispatch`: `collections:mindate-request`, `collections:mindate-done`
 *
 * ```js
 * joola.collections.mindate('dummyCollection', function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.mindate = {
  name: "/api/collections/mindate",
  description: "I provide the minimum date available in the collection",
  inputs: {
    required: ['id'],
    optional: ['key']
  },
  _outputExample: {},
  _permission: ['manage_system'],
  _dispatch: {
    message: 'collections:mindate'
  },
  run: function (context, id, key, callback) {
    if (typeof key === 'function') {
      callback = key;
      key = null;
    }
    callback = callback || emptyfunc;

    exports.get.run(context, id, function (err, value) {
      if (err)
        return callback(err);

      var sortKey = {};
      sortKey[key ? key : 'timestamp'] = 1;
      joola.mongo.find('cache', id, {}, {limit: 1, sort: sortKey}, function (err, result) {
        if (err)
          return callback(err);

        return callback(null, result && result[0] && result[0].timestamp ? new Date(result[0].timestamp) : null);
      });
    });
  }
};