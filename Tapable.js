// source code: https://github.com/webpack/tapable/blob/28078212b9e0a773502061d190b1a66bd5b5a144/lib/Tapable.js

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// const util = require("util");
const SyncBailHook = require("./SyncBailHook");

function Tapable() {
	this._pluginCompat = new SyncBailHook(["options"]);

  // 将 options 中的 name 格式化后，添加到 names 中。
  this._pluginCompat.tap({
    name: "Tapable camelCase",
    stage: 100
  }, options => {
    options.names.add(
      options.name.replace(/[- ]([a-z])/g, (str, ch) => ch.toUpperCase())
    );
  });

  // 找到值不为 undefined 的 hook，根据实际参数，传入 hook.tap | hook.tapAsync 中
  this._pluginCompat.tap({
    name: "Tapable this.hooks",
    stage: 200
  }, options => {
    let hook;

    for (const name of options.names) {
      hook = this.hooks[name];
      if (hook !== undefined) {
        break;
      }
    }
    if (hook !== undefined) {
      const tapOpt = {
        name: options.fn.name || "unnamed compat plugin",
        stage: options.stage || 0
      };
      if (options.async) hook.tapAsync(tapOpt, options.fn);
      else hook.tap(tapOpt, options.fn);
      return true;
    }
  });
}
module.exports = Tapable;

Tapable.addCompatLayer = function addCompatLayer(instance) {
	Tapable.call(instance);
	instance.plugin = Tapable.prototype.plugin;
	instance.apply = Tapable.prototype.apply;
};

Tapable.prototype.plugin = util.deprecate(function plugin(name, fn) {
	if (Array.isArray(name)) {
		name.forEach(function(name) {
			this.plugin(name, fn);
		}, this);
		return;
	}
	const result = this._pluginCompat.call({
		name: name,
		fn: fn,
		names: new Set([name])
	});
	if (!result) {
		throw new Error(
			`Plugin could not be registered at '${name}'. Hook was not found.\n` +
				"BREAKING CHANGE: There need to exist a hook at 'this.hooks'. " +
				"To create a compatibility layer for this hook, hook into 'this._pluginCompat'."
		);
	}
}, "Tapable.plugin is deprecated. Use new API on `.hooks` instead");

Tapable.prototype.apply = util.deprecate(function apply() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].apply(this);
	}
}, "Tapable.apply is deprecated. Call apply on the plugin directly instead");