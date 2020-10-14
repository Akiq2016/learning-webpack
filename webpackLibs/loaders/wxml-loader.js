const path = require("path");
const { getOptions, urlToRequest } = require("loader-utils");
const sax = require("sax");

const ROOT_TAG_NAME = "xxx-wxml-root-xxx";
const ROOT_TAG_START = `<${ROOT_TAG_NAME}>`;
const ROOT_TAG_END = `</${ROOT_TAG_NAME}>`;
const ROOT_TAG_LENGTH = ROOT_TAG_START.length;

/**
 * interface collectedTags {
 *    [tagname: string]: {
 *        [attrname: string]: boolean;
 *    }
 * }
 */
let collectedTags = {};
const getCollectedTags = () => {
  return {
    audio: {
      src: true,
      poster: true,
    },
    "live-player": {
      src: true,
    },
    "live-pusher": {
      "waiting-image": true,
    },
    video: {
      src: true,
      poster: true,
    },
    "cover-image": {
      src: true,
    },
    image: {
      src: true,
    },
    wxs: {
      src: true,
    },
    import: {
      src: true,
    },
    include: {
      src: true,
    },
  };
};

/**
 * 判断路径是否为本地静态路径
 * @param {string} _path
 * @return {string|null}
 */
const getValidLocalPath = (_path) => {
  // 不存在 ｜ 含有变量 ｜ 含有协议
  if (!_path || /\{\{/.test(_path) || /^(https?:)?\/\//.test(_path)) {
    return null;
  }

  return _path;
};

/**
 * 从标签中分析属性 收集本地资源路径数组
 * @param {object} node
 * @return {array}
 */
const getResourceRelativePaths = (node) => {
  const { name: tagName, attributes } = node;
  const curTagDict = collectedTags[tagName];
  const result = [];

  if (curTagDict) {
    Object.keys(curTagDict).forEach((attr) => {
      if (attributes[attr] && curTagDict[attr]) {
        const val = getValidLocalPath(attributes[attr]);
        if (val) {
          result.push(val);
        }
      }
    });
  }

  return result;
};

const mergeCollectedTags = (defaultOpt, customOpt) => {
  if (
    customOpt &&
    typeof customOpt === "object" &&
    Object.keys(customOpt).length
  ) {
    Object.keys(customOpt).forEach((tagname) => {
      if (defaultOpt[tagname]) {
        defaultOpt[tagname] = {
          ...defaultOpt[tagname],
          ...customOpt[tagname],
        };
      } else {
        defaultOpt[tagname] = customOpt[tagname];
      }
    });
  }
};

async function handleReq(req) {
  this.addDependency(req);
  await new Promise((resolve, reject) => {
    this.loadModule(req, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * 解析 wxml 收集并处理本地依赖
 * 收集的规则，包括内置规则和外部自定义配置的规则(todo)
 * @param {string} content
 */
module.exports = function wxmlLoader(content) {
  const that = this;
  that.cacheable();

  let requests = [];
  const callback = that.async();
  const options = getOptions(that) || {};
  const rootContext = that.rootContext;
  const parser = sax.parser(false, { lowercase: true });
  const reqHandler = handleReq.bind(that);
  collectedTags = getCollectedTags();
  mergeCollectedTags(collectedTags, options.collectedTags);

  // an error happened.
  parser.onerror = function onParserError(e) {
    callback(e, content);
  };

  // opened a tag. node has "name" and "attributes"
  parser.onopentag = function onParserOpenTag(node) {
    requests = requests.concat(
      getResourceRelativePaths(node).map((_path) =>
        urlToRequest(_path, rootContext)
      )
    );
  };

  // parser stream is done, and ready to have more stuff written to it.
  parser.onend = async function onParserEnd() {
    try {
      await Promise.all(requests.map(reqHandler));
      callback(null, content);
    } catch (error) {
      callback(error, content);
    }
  };

  parser.write(`${ROOT_TAG_START}${content}${ROOT_TAG_END}`).close();
  return;
};
