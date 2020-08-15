const { resolve } = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MinaPlugin = require('./plugins/MinaWebpackPlugin');
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  // Chosen mode tells webpack to use its built-in optimizations accordingly.
  mode: "none",

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
  entry: './app.js',

  // options related to how webpack emits results
  output: {
    // [absolute path], the target directory for all output files
    path: resolve("dist"),
    // for multiple entry points
    filename: "[name].js"
  },

  // how the different types of modules within a project will be treated.
  module: {
    // A Rule can be separated into three parts
    // Conditions, Results and nested Rules.
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader"
      }
    ]
  },

  // list of additional plugins
  plugins: [
    // todo
    new MinaPlugin(),
    new CleanWebpackPlugin({
      // Automatically remove all unused webpack assets on rebuild
      cleanStaleWebpackAssets: false,
    }),

    // it is to copy files that already exist in the source tree, as part of the build process.
    new CopyPlugin({
      patterns:[
        {
          from: "**/*",
          to: "./",
          // To exclude files from the selection, you should use globOptions.ignore option
          // 被依赖的脚本会打包到对应的入口文件中，而不需要无脑copy到dist中
          globOptions: {
            ignore: ['**/*.js']
          }
        }
      ]
    })
  ]
};
