const path = require("path");
const fs = require("fs");
const SingleEntryPlugin = require("webpack/lib/SingleEntryPlugin");
const MultiEntryPlugin = require("webpack/lib/MultiEntryPlugin");
const { ConcatSource } = require("webpack-sources");
const replaceExt = require("replace-ext");

// https://www.npmjs.com/package/ensure-posix-path
function ensurePosix(filepath) {
  if (path.sep !== "/") {
    return filepath.split(path.sep).join("/");
  }
  return filepath;
}

// https://www.npmjs.com/package/required-path
function requiredPath(pathStr) {
  if (path.isAbsolute(pathStr)) {
    return pathStr;
  } else {
    return "./" + pathStr;
  }
}

// todo: 分包关键词
// todo: 不同类型文件的热更新
// todo: 那动态添加新的文件的时候怎么处理
// todo: 我创建了的组件 但是没有被引用过 就会出现dist里对应这个组件下 其他文件复制过去了 但是js文件没有复制过去
module.exports = class MinaPlugin {
  static entryConfigKeywords = ["pages", "usingComponents"];

  constructor() {
    // 所有入口文件的绝对路径的集合
    this.entries = [];
  }

  apply(compiler) {
    // compiler.run前 处理好入口文件
    compiler.hooks.entryOption.tap("MinaPlugin", () => {
      this.handleEntries(compiler);
      return true;
    });

    // emit assets前 处理template字符串 将chunk与其依赖的其他chunk建立关系 在模版中require注入
    compiler.hooks.compilation.tap("MinaPlugin", (compilation) => {
      this.registerRenderWithEntry(compilation, compilation.mainTemplate);
      // todo: chunkTemplate 的需要考虑吗？
      this.registerRenderWithEntry(compilation, compilation.chunkTemplate);
    });

    // 文件变化时 处理文件
    compiler.hooks.watchRun.tap("MinaPlugin", (compiler) => {
      this.handleEntries(compiler);
    });
  }

  handleEntries(compiler) {
    const { context: ctx, entry } = compiler.options;

    // 找到所有的入口文件
    this.getEntries(ctx, entry);

    // 按需调用 addEntry
    this.entries.forEach((item) => {
      const rPath = path.relative(ctx, item);
      const p = this.itemToPlugin(ctx, "./" + rPath, replaceExt(rPath, ""));
      p.apply(compiler);
    });

    console.log("入口文件:", this.entries);
  }

  /**
   * 最开始执行这个方法的一定是小程序的启动文件 比如 app.js
   * 然后递归查找同路径下的json配置文件中依赖的文件
   * @param {string} context entry相对于这个目录地址
   * @param {string} entry 入口文件的相对路径
   */
  getEntries(context, entry) {
    const currentEntry = path.resolve(context, entry);

    // 检查入口文件的有效性
    if (!entry || !fs.existsSync(currentEntry)) {
      console.warn(`入口文件${entry}不存在:`, currentEntry);
      return;
    }

    if (!this.entries.includes(currentEntry)) {
      // 加入入口文件列表
      this.entries.push(currentEntry);

      // 检查当前入口同级同名 json 配置文件
      const currentConfig = replaceExt(currentEntry, ".json");

      try {
        if (fs.existsSync(currentConfig)) {
          const configData = JSON.parse(fs.readFileSync(currentConfig, "utf8"));

          // 读取配置文件 分析获得更多入口文件
          MinaPlugin.entryConfigKeywords.forEach((key) => {
            const dict = configData[key];
            if (typeof dict === "object") {
              Object.values(dict).forEach((_entry) => {
                // todo: 目前写死读js后缀 未来支持 extensions 描述支持的后缀 并按优先级匹配查找
                this.getEntries(path.dirname(currentConfig), `${_entry}.js`);
              });
            }
          });
        }
      } catch (error) {
        console.log(`${currentConfig}配置文件出错`, error);
      }
    }
  }

  /**
   * 来源 webpack/lib/EntryOptionPlugin.js
   * @param {string} context context path
   * @param {EntryItem} item entry array or single path
   * @param {string} name entry key name
   * @returns {SingleEntryPlugin | MultiEntryPlugin} returns either a single or multi entry plugin
   */
  itemToPlugin(context, item, name) {
    console.log("item: ", item);
    console.log("name: ", name);
    if (Array.isArray(item)) {
      return new MultiEntryPlugin(context, item, name);
    }
    return new SingleEntryPlugin(context, item, name);
  }

  isRuntimeExtracted(compilation) {
    // note:todo: 具体查阅 Chunk.js
    return compilation.chunks.some(
      (c) => c.isOnlyInitial() && c.hasRuntime() && !c.hasEntryModule()
    );
  }

  registerRenderWithEntry(compilation, tpl) {
    tpl.hooks.renderWithEntry.tap("MinaPlugin", (source, curChunk) => {
      console.log("当前处理的chunk:", curChunk.name);
      if (!this.isRuntimeExtracted(compilation)) {
        throw new Error(
          [
            "Please reuse the runtime chunk to avoid duplicate loading of javascript files.",
            "Simple solution: set `optimization.runtimeChunk` to `{ name: 'runtime.js' }` .",
            "Detail of `optimization.runtimeChunk`: https://webpack.js.org/configuration/optimization/#optimization-runtimechunk .",
          ].join("\n")
        );
      }

      // 不是入口 chunk 直接返回模板内容
      if (!curChunk.hasEntryModule()) {
        return source;
      }

      let dependencies = [];

      // note: 找到该入口 chunk 依赖的其它所有 chunk
      curChunk.groupsIterable.forEach((group) => {
        group.chunks.forEach((chunk) => {
          console.log("依赖的chunk:", chunk.name);

          // 始终认为 output.filename 是 chunk.name 来做处理
          let filename = ensurePosix(
            path.relative(path.dirname(curChunk.name), chunk.name)
          );

          if (chunk === curChunk || ~dependencies.indexOf(filename)) {
            return;
          }

          dependencies.push(filename);
        });
      });

      // 在源码前面拼接代码依赖
      source = new ConcatSource(
        ";" +
          dependencies
            .map((file) => `require('${requiredPath(file)}');`)
            .join(""),
        source
      );

      return source;
    });
  }
};
