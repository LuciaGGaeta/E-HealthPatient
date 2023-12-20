const path = require("path");
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  plugins: [
    new NodePolyfillPlugin()
  ],
  resolve: { fallback: { stream: require.resolve("stream-browserify") }

    },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [{ loader: "style-loader" }, { loader: "css-loader" }],
      },
    ],
    
  },
  devServer: {
    static: "./dist",
  },
};