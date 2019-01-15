const { resolve, join } = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { version } = require('../package');

const componentEntries = {};
fs.readdirSync(resolve('src/components')).forEach((name) => {
  const componentDir = resolve('src/components', name);
  if (!fs.statSync(componentDir).isDirectory()) return;
  componentEntries[name] = componentDir;
});

module.exports = () => {
  return new Promise(done => {
    const entry = {
      /*
       * Default version and entry of npm.
       */
      atag: [
        resolve('vendors/intersection-observer.js'),
        resolve('vendors/custom-elements-es5-adapter.js'),
        resolve('vendors/es-polyfills'),
        resolve('src/externals'),
        resolve('src/index'),
        resolve('src/dynamicLoader'),
      ],

      /**
       * Each component register.
       */
      ...componentEntries,
    };
    const config = {
      entry,
      module: {
        rules: [
          {
            test: /\.css$/,
            use: 'raw-loader',
          },
          {
            test: /\.less$/,
            use: ['raw-loader', 'less-loader'],
          },
          {
            test: /\.html$/,
            use: ['babel-loader', 'polymer-webpack-loader'],
          },
          {
            test: /\.js$/,
            loader: 'babel-loader',
            options: {
              babelrc: true,
              extends: join(__dirname + '/../.babelrc'),
            },
            exclude: [resolve('vendors')],
          },
          {
            test: /\.(png|gif|jpe?g|svg)$/i,
            loader: 'url-loader',
          },
        ],
      },
      resolve: {
        modules: ['node_modules'],
        extensions: ['.js', '.json', '.html'],
        alias: {
          components: resolve('src/components'),
        },
      },
      externals: {
        '@polymer/polymer': 'Polymer',
        '@polymer/polymer/lib/utils/gestures': 'PolymerGestures',
        '@polymer/polymer/lib/utils/render-status': 'PolymerRenderStatus',
        '@polymer/polymer/lib/elements/dom-repeat': 'PolymerDOMRepeat',
      },
      devServer: {
        contentBase: resolve(fs.realpathSync(process.cwd()), 'demo'),
        port: 9001,
        hot: false, // Multi entry with HMR is a disaster.
        inline: false,
      },
      plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(
            process.env.NODE_ENV
          ),
          'VERSION': JSON.stringify(
            version
          )
        }),
        new webpack.BannerPlugin({
          banner: `${new Date()}`,
        }),
        // Generates an `index.html` file with the <script> injected.
        new HtmlWebpackPlugin({
          inject: false,
          template: resolve(
            fs.realpathSync(process.cwd()),
            'demo/index.htm'
          ),
        }),
      ],
    };
    done(config);
  });
};
