/**
 * @plugin
 * Plugins expose the full potential of the webpack engine to third-party developers.
 * Using staged build callbacks, developers can introduce their own behaviors into the webpack build process.
 * 
 * @apply
 * Plugins are instantiated objects with an [apply] method on their prototype.
 * This apply method is called once by the webpack compiler while installing the plugin.
 * The apply method is given a reference to the [underlying webpack compiler].
 * 
 * @compiler
 * @compilation
 * Among the two most important resources while developing plugins are the [compiler] and [compilation] objects.
 * Understanding their roles is an important first step in extending the webpack engine.
 * The list of hooks available on the compiler, compilation, and other important objects, see the plugins API docs.
 * https://webpack.js.org/api/plugins/
 * https://webpack.docschina.org/api/plugins/
 * 
 * @tapable
 * [tapable] provides the backbone of webpack's plugin interface.
 * Many objects in webpack extend the Tapable class.
 * The class exposes [tap], [tapAsync], and [tapPromise] methods which plugins can use to inject custom build steps
 * that will be fired throughout a compilation.
 * 
 * The tapable package expose many Hook classes, which can be used to create hooks for plugins.
 * const {
 *    SyncHook, SyncBailHook, SyncWaterfallHook, SyncLoopHook,
 *    AsyncParallelHook, AsyncParallelBailHook, AsyncSeriesHook, AsyncSeriesBailHook, AsyncSeriesWaterfallHook
 * } = require("tapable");
 * All Hook constructors take one optional argument, which is a list of argument names as strings.
 * 
 * class Car {
 * 	constructor() {
 * 		this.hooks = {
 * 			accelerate: new SyncHook(["newSpeed"]),
 * 			brake: new SyncHook(),
 * 			calculateRoutes: new AsyncParallelHook(["source", "target", "routesList"])
 * 		};
 * 	}
 * 	// .... //
 * }
 * 
 * const myCar = new Car();
 * 
 * // Use the tap method to add a consument
 * myCar.hooks.brake.tap("WarningLampPlugin", () => warningLamp.on());
 * 
 * @hooks
 * 1. Basic hook (without “Waterfall”, “Bail” or “Loop” in its name). 
 * This hook simply calls every function it tapped in a row.
 * 
 * 2. Waterfall.
 * A waterfall hook also calls each tapped function in a row.
 * Unlike the basic hook, it passes a return value from each function to the next function.
 * 
 * 3. Bail.
 * A bail hook allows exiting early.
 * When any of the tapped function returns anything, the bail hook will stop executing the remaining ones.
 * 
 * A plugin for webpack consists of:
 * 1. A named JavaScript function or a JavaScript class.
 * 2. Defines apply method in its prototype.
 * 3. Specifies an event hook to tap into. 
 * 4. Manipulates webpack internal instance specific data. 
 * 5. Invokes webpack provided callback after functionality is complete. [todo]
 * 
 * 
 * new Webpack(options) ->
 * new compiler -> options.plugin.forEach(plugin => {plugin.apply(compiler)}) ->
 * compiler.run() -> 
 * return compiler
 */
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin')
const MultiEntryPlugin = require('webpack/lib/MultiEntryPlugin')
const path = require('path')
const fs = require('fs')
const replaceExt = require('replace-ext')

/**
 * 来源 webpack/lib/EntryOptionPlugin.js 
 * @param {string} context context path
 * @param {EntryItem} item entry array or single path
 * @param {string} name entry key name
 * @returns {SingleEntryPlugin | MultiEntryPlugin} returns either a single or multi entry plugin
 */
const itemToPlugin = (context, item, name) => {
  console.log('context',context)
  console.log('item',item)
  console.log('name',name)
	if (Array.isArray(item)) {
		return new MultiEntryPlugin(context, item, name);
	}
	return new SingleEntryPlugin(context, item, name);
};

/**
 * 最开始执行这个方法的一定是小程序的启动文件 比如 app.js
 * 然后递归查找同路径下的json配置文件中依赖的文件
 * @param {array} entries 存储所有入口文件的数组
 * @param {string} dirname entry相对于这个目录地址
 * @param {string} entry 入口文件的相对路径
 */
function inflateEntries(entries, dirname, entry) {
  const currentEntry = path.resolve(dirname, entry);

  // 检查该入口文件的有效性
  if (!entry || !fs.existsSync(currentEntry)) {
    throw new Error(`入口文件${entry}不存在:`, currentEntry);
  }

  if (!entries.includes(currentEntry)) {
    // 加入入口文件列表
    entries.push(currentEntry);

    // 检查同级同名 json 配置文件
    const currentConfig = replaceExt(currentEntry, '.json');

    try {
      if (fs.existsSync(currentConfig)) {
        const configData = JSON.parse(fs.readFileSync(currentConfig, 'utf8'))
        // todo: 分包关键词 todo: 列表定义拆分出去
        const preserveList = ['pages', 'usingComponents'];
        preserveList.forEach((key) => {
          const item = configData[key];
          if (typeof item === 'object') {
            Object.values(item).forEach((_entry) => {
              // todo: 不应该写死后缀
              inflateEntries(entries, path.dirname(currentConfig), `${_entry}.js`)
            })
          }
        })
      }
    } catch (error) {
      console.log(`${currentConfig}配置文件出错`, error)
    }
  }
}

class MinaWebpackPlugin {
  constructor() {
    this.entries = []
  }

  // todo: 那动态添加新的文件的时候怎么处理 
  // todo: 我创建了的组件 但是没有被引用过 就会出现dist里对应这个组件下 其他文件复制过去了 但是js文件没有复制过去
  // todo: 为了动态注册入口，除了可以监听 entryOption 这个钩子外，我们还可以监听 make 这个钩子来达到同样的目的。
  apply(compiler) {
    console.log('开始执行 MinaWebpackPlugin.apply 内容')
    const { context, entry } = compiler.options
    // 找到所有的入口文件，存放在 entries 里面
    inflateEntries(this.entries, context, entry)
    console.log('所有入口文件：', this.entries);

    // 这里订阅了 compiler 的 entryOption 事件，当事件发生时，就会执行回调里的代码
    compiler.hooks.entryOption.tap('MinaWebpackPlugin', () => {
      this.entries.forEach(item => {
        itemToPlugin(
          context,
          './' + path.relative(context, item),
          replaceExt(path.relative(context, item), ''),
        ).apply(compiler)
      })
      return true;
    })
  }
}

module.exports = MinaWebpackPlugin
