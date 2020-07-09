const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
require("@babel/register");

// Static files
const express = require("express");
const app = express();

module.exports = {
  mode: "development",

  entry: {
    babel: "@babel/polyfill",
    index: "./src/page-index/main.js",
    viewauctions: "./src/page-auction/main.js",
  },

  output: {
    path: path.resolve(__dirname, "./static"),
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
        exclude: /node_modules/,
      },
    ],
  },

  plugins: [
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
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
  ],

  watch: true,
  devtool: "source-map",
  devServer: {
    contentBase: path.join(__dirname, "static"),
    compress: true,
    port: 9000,
  },
};
