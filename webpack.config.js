module.exports = {
    entry: ["babel-polyfill", "./src/client.js"],
    output: {
        filename: "./resources/bundle.js"
    },
    module: {
        loaders: [
            { test: /\.css$/, loader: "style-loader!css-loader" },
            { test: /\.js$/, 
                exclude : /node-modules\/.*/,
                loader: "babel-loader",
                options: {
                    cacheDirectory : true,
                    presets: ['react','env']
                }
            }

        ]
    }
};