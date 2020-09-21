const path = require("path");
const { getOptions, urlToRequest } = require("loader-utils");
const sax = require("sax");

const ROOT_TAG_NAME = "xxx-wxml-root-xxx";
const ROOT_TAG_START = `<${ROOT_TAG_NAME}>`;
const ROOT_TAG_END = `</${ROOT_TAG_NAME}>`;
const ROOT_TAG_LENGTH = ROOT_TAG_START.length;

// todo 支持与配置合并
const resourceAttrDict = {
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
const getResourcePaths = (node) => {
  const { name: tagName, attributes } = node;
  const curTagDict = resourceAttrDict[tagName];
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

const handleReq = async (req) => {
  // todo;
};

module.exports = function wxmlLoader(content) {
  this.cacheable();

  // todo: string[]
  let requests = [];
  const self = this;
  const callback = this.async();
  const options = getOptions(this) || {};
  const rootContext = this.rootContext;
  const context = this.context;
  const parser = sax.parser(false, { lowercase: true });

  // an error happened.
  parser.onerror = function onParserError(e) {
    callback(e, content);
  };

  // opened a tag. node has "name" and "attributes"
  parser.onopentag = function onParserOpenTag(node) {
    requests = requests.concat(
      getResourcePaths(node).map((_path) => urlToRequest(_path, rootContext))
    );
  };

  // parser stream is done, and ready to have more stuff written to it.
  parser.onend = async function onParserEnd() {
    try {
      console.log("myrequests:", requests);
      for (const req of requests) {
        await handleReq(req);
      }
      callback(null, content);
    } catch (error) {
      callback(error, content);
    }
  };

  parser.write(`${ROOT_TAG_START}${content}${ROOT_TAG_END}`).close();
};
