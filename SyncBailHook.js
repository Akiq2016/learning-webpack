// source code: https://github.com/webpack/tapable/blob/28078212b9/lib/SyncBailHook.js

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Hook = require("./Hook");
const HookCodeFactory = require("./HookCodeFactory");

class SyncBailHookCodeFactory extends HookCodeFactory {
  content({ onError, onResult, onDone, rethrowIfPossible }) {
    return this.callTapsSeries({
      onError: (i, err) => onError(err),
      onResult: (i, result, next) =>
        `if(${result} !== undefined) {\n${onResult(
          result
        )};\n} else {\n${next()}}\n`,
      onDone,
      rethrowIfPossible
    });
  }
}

const factory = new SyncBailHookCodeFactory();

class SyncBailHook extends Hook {
  tapAsync() {
    throw new Error("tapAsync is not supported on a SyncBailHook");
  }

  tapPromise() {
    throw new Error("tapPromise is not supported on a SyncBailHook");
  }

  compile(options) {
    // 把每个tap的fn返回出来 挂载在实例的 _x 数组上
    // setup(instance, options) {
    //   instance._x = options.taps.map(t => t.fn);
    // }
    factory.setup(this, options);
    // 根据options 动态创建并返回方法（sync / async / promise）
    return factory.create(options);
  }
}

module.exports = SyncBailHook;