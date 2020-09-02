const webpack = require("webpack");
const { resolve } = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MinaPlugin = require("./plugins/MinaWebpackPlugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const useProdMode = process.env.USE_PROD_MODE;

module.exports = {
  // https://webpack.js.org/configuration/mode/#root
  // 决定用哪种[构建类型]的配置 要和环境配置区分开来
  // Chosen mode tells webpack to use its built-in optimizations accordingly.
  mode: useProdMode ? "production" : "none",

  // todo:note: 小程序环境没有eval
  // devtool: useProdMode ? "source-map" : "eval",

  // [absolute path], the home directory for webpack,
  // the entry and module.rules.loader option is resolved relative to this directory
  context: resolve("src"),

  // defaults to ./src, here our entry is miniapp entry file app.js
  // Here the application starts executing and webpack starts bundling
  // entry: {
  //   'app': './app.js',
  //   'pages/index/index': './pages/index/index.js',
  //   'pages/logs/logs': './pages/logs/logs.js'
  // },
  entry: "./app.js",

  // options related to how webpack emits results
  output: {
    // [absolute path], the target directory for all output files
    path: resolve("dist"),
    // for multiple entry points
    filename: "[name].js",
    // default string = 'window' // todo: global?
    globalObject: "wx",
  },

  optimization: {
    // adds an additional chunk containing only the runtime to each entrypoint.
    runtimeChunk: {
      name: "runtime",
    },
    splitChunks: {
      // it means that chunks can be shared even between async and non-async chunks.
      chunks: "all",
      name: "vendors",
      minChunks: 2,
      minSize: 0,
    },
  },

  // how the different types of modules within a project will be treated.
  module: {
    // A Rule can be separated into three parts
    // Conditions, Results and nested Rules.
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
      },
      {
        test: /\.(wxss|wxml|png|jpe?g|gif)$/,
        include: new RegExp("src"),
        loader: "file-loader",
        options: {
          name: "[path][name].[ext]",
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
  ],
};
