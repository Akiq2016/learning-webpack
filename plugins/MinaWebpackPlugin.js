const SingleEntryPlugin = require("webpack/lib/SingleEntryPlugin");
const MultiEntryPlugin = require("webpack/lib/MultiEntryPlugin");
const path = require("path");
const fs = require("fs");
const replaceExt = require("replace-ext");

module.exports = class MinaWebpackPlugin {
  constructor() {
    this.entries = [];
  }

  // todo: 那动态添加新的文件的时候怎么处理
  // todo: 我创建了的组件 但是没有被引用过 就会出现dist里对应这个组件下 其他文件复制过去了 但是js文件没有复制过去
  // todo: 为了动态注册入口，除了可以监听 entryOption 这个钩子外，我们还可以监听 make 这个钩子来达到同样的目的。
  apply(compiler) {
    console.log("开始执行 MinaWebpackPlugin.apply 内容");
    const { context, entry } = compiler.options;

    // 找到所有的入口文件，存放在 entries 里面
    this.inflateEntries(this.entries, context, entry);
    console.log("所有入口文件：", this.entries);

    // 这里订阅了 compiler 的 entryOption 事件，当事件发生时，就会执行回调里的代码
    compiler.hooks.entryOption.tap("MinaWebpackPlugin", () => {
      // todo 应该可以在回调函数的第一个参数拿到entry 可以试试
      this.entries.forEach((item) => {
        this.itemToPlugin(
          context,
          "./" + path.relative(context, item),
          replaceExt(path.relative(context, item), "")
        ).apply(compiler);
      });
      return true;
    });
  }

  /**
   * 来源 webpack/lib/EntryOptionPlugin.js
   * @param {string} context context path
   * @param {EntryItem} item entry array or single path
   * @param {string} name entry key name
   * @returns {SingleEntryPlugin | MultiEntryPlugin} returns either a single or multi entry plugin
   */
  itemToPlugin(context, item, name) {
    console.log("context", context);
    console.log("item", item);
    console.log("name", name);
    if (Array.isArray(item)) {
      return new MultiEntryPlugin(context, item, name);
    }
    return new SingleEntryPlugin(context, item, name);
  }

  /**
   * 最开始执行这个方法的一定是小程序的启动文件 比如 app.js
   * 然后递归查找同路径下的json配置文件中依赖的文件
   * @param {array} entries 存储所有入口文件的数组
   * @param {string} dirname entry相对于这个目录地址
   * @param {string} entry 入口文件的相对路径
   */
  inflateEntries(entries, dirname, entry) {
    const currentEntry = path.resolve(dirname, entry);

    // 检查该入口文件的有效性
    if (!entry || !fs.existsSync(currentEntry)) {
      throw new Error(`入口文件${entry}不存在:`, currentEntry);
    }

    if (!entries.includes(currentEntry)) {
      // 加入入口文件列表
      entries.push(currentEntry);

      // 检查同级同名 json 配置文件
      const currentConfig = replaceExt(currentEntry, ".json");

      try {
        if (fs.existsSync(currentConfig)) {
          const configData = JSON.parse(fs.readFileSync(currentConfig, "utf8"));
          // todo: 分包关键词 todo: 列表定义拆分出去
          const preserveList = ["pages", "usingComponents"];
          preserveList.forEach((key) => {
            const item = configData[key];
            if (typeof item === "object") {
              Object.values(item).forEach((_entry) => {
                // todo: 不应该写死后缀
                this.inflateEntries(
                  entries,
                  path.dirname(currentConfig),
                  `${_entry}.js`
                );
              });
            }
          });
        }
      } catch (error) {
        console.log(`${currentConfig}配置文件出错`, error);
      }
    }
  }
};
