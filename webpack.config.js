const webpack = require("webpack");
const path = require("path");
const fs = require("fs");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;
const replaceExt = require("replace-ext");
const MinaPlugin = require("./plugins/MinaWebpackPlugin");

const srcPath = path.resolve("src");
const distPath = path.resolve("dist");

// [absolute path], the home directory for webpack,
// the entry and module.rules.loader option is resolved relative to this directory
const context = srcPath;

// defaults to ./src, here our entry is miniapp entry file app.js
// Here the application starts executing and webpack starts bundling
// entry: {
//   'app': './app.js',
//   'pages/index/index': './pages/index/index.js',
//   'pages/logs/logs': './pages/logs/logs.js'
// },
const entry = "./app.js";

const useProdMode = process.env.USE_PROD_MODE;

/**
 * @param {*} webpackConfig
 * @testCase
 * 1. A 依赖在非分包目录下 被引用 2 次以上 -> 打入主包根目录下vendor
 * 2. B 依赖在分包目录下 被引用 2 次以上 -> 打入分包根目录下vendor
 */
const getSplitChunksCacheGroups = (webpackConfig) => {
  // 找到 app.json 确定分包路径
  const curEntry = path.resolve(webpackConfig.context, webpackConfig.entry);
  const curConfig = replaceExt(curEntry, ".json");

  // 检查 app.json 配置 获取分包的根目录数组
  const config = JSON.parse(fs.readFileSync(curConfig, "utf8"));
  const subPkg = config.subpackages || config.subPackages || [];
  const subPkgRoots = subPkg.map((item) => item.root);

  const res = subPkgRoots.reduce((acc, val, index) => {
    acc[`subVendor${index}`] = {
      name: `${val}/vendor`,
      test(module) {
        if (module.resource) {
          console.log(
            val,
            "[check]",
            module.resource.indexOf(val),
            "::",
            module.resource
          );
        }
        return (
          module.resource &&
          module.resource.indexOf(webpackConfig.context + "/" + val) !== -1
        );
      },
      priority: 0,
    };
    return acc;
  }, {});

  return res;
};

const useFileLoader = (ext = "[ext]") => ({
  loader: "file-loader",
  options: {
    name: `[path][name].${ext}`,
  },
});

const webpackConfig = Object.assign(
  {
    context,
    entry,
  },
  {
    // https://webpack.js.org/configuration/mode/#root
    // 决定用哪种[构建类型]的配置 要和环境配置区分开来
    // Chosen mode tells webpack to use its built-in optimizations accordingly.
    mode: useProdMode ? "production" : "none",

    // note: 小程序环境没有eval
    devtool: useProdMode
      ? "cheap-module-source-map"
      : "eval-cheap-module-source-map",

    // options related to how webpack emits results
    output: {
      // [absolute path], the target directory for all output files
      path: distPath,
      // for multiple entry points
      filename: "[name].js",
      // default string = 'window' // todo: global?
      globalObject: "wx",
    },

    optimization: {
      // todo
      usedExports: true,
      // adds an additional chunk containing only the runtime to each entrypoint.
      runtimeChunk: {
        name: "runtime",
      },
      // This configuration object represents the default behavior of the SplitChunksPlugin.
      splitChunks: {
        chunks: "all",
        minSize: 0,
        minChunks: 2,
        name: "vendor",
        cacheGroups: getSplitChunksCacheGroups({
          context,
          entry,
        }),
      },
    },

    // how the different types of modules within a project will be treated.
    module: {
      // A Rule can be separated into three parts
      // Conditions, Results and nested Rules.
      rules: [
        // todo: 暂时屏蔽
        // {
        //   enforce: "pre",
        //   test: /\.js$/,
        //   exclude: /node_modules/,
        //   loader: "eslint-loader",
        // },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "babel-loader",
        },
        {
          test: /\.wxs$/,
          use: [useFileLoader("wxs"), "babel-loader"],
        },
        {
          test: /\.(less|wxss)$/,
          use: [useFileLoader("wxss"), "less-loader"],
        },
        {
          test: /\.wxml$/,
          use: [
            {
              loader: "file-loader",
              options: {
                name: `[path][name].wxml`,
                useRelativePath: true,
                context: srcPath,
                esModule: false,
              },
            },
            {
              loader: "wxml-loader",
              options: {
                root: srcPath,
                enforceRelativePath: true,
                publicPath: "/",
              },
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif)$/,
          loader: "image-webpack-loader",
          enforce: "pre",
        },
        {
          test: /\.(png|jpe?g|gif)$/,
          include: new RegExp("src"),
          loader: "file-loader",
          options: {
            name: "[path][name].[ext]",
            esModule: false,
          },
        },
        // issue: https://github.com/webpack-contrib/file-loader/issues/259
        {
          test: /\.json$/,
          include: new RegExp("src"),
          loader: "file-loader",
          type: "javascript/auto",
          options: {
            name: "[path][name].[ext]",
          },
        },
      ],
    },

    // list of additional plugins
    plugins: [
      new webpack.EnvironmentPlugin({
        // 使用正式服appid
        USE_PROD_APPID: false,
        // 使用开发环境
        USE_PROD_BACKEND: false,
        // 使用发布构建
        USE_PROD_MODE: false,
      }),

      new MinaPlugin(),

      new CleanWebpackPlugin({
        // Automatically remove all unused webpack assets on rebuild
        cleanStaleWebpackAssets: false,
      }),

      // 小程序不支持在脚本中require资源，wxml无法解析动态资源。
      // 故直接输出这类资源
      new CopyPlugin({
        patterns: [
          {
            from: "**/*.{jpg,png,gif,jpeg}",
          },
        ],
      }),

      // 分析资源
      new BundleAnalyzerPlugin(),
    ],
  }
);

module.exports = webpackConfig;
