const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
require("@babel/register");

module.exports = {
  mode: "production",

  entry: {
    babel: "@babel/polyfill",
    index: "./src/page-index/main.js",
    viewauctions: "./src/page-auction/main.js",
  },

  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "[name].[hash:20].js",
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        // Load all images as base64 encoding if they are smaller than 8192 bytes
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: "url-loader",
            options: {
              name: "[path][name].[ext]?hash=[hash:20]",
              esModule: false,
              limit: 8192,
            },
          },
        ],
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["babel", "index"],
      filename: "index.html",
      template: path.resolve(__dirname, "src", "page-index", "index.html"),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["babel", "viewauctions"],
      filename: "viewauctions.html",
      template: path.resolve(
        __dirname,
        "src",
        "page-auction",
        "view-auction.html"
      ),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["babel", "viewauctions"],
      filename: "myauction.html",
      template: path.resolve(
        __dirname,
        "src",
        "page-myauction",
        "my-auction.html"
      ),
    }),
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
      chunkFilename: "[id].[contenthash].css",
    }),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
  ],

  watch: false,
  devtool: "source-map",
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
      }),
      new OptimizeCssAssetsPlugin({}),
    ],
  },
};
