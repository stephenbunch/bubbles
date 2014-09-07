module.exports = function(config) {
  config.set({

    frameworks: [ "mocha" ],

    files: [
        "dist/type.js",
        { pattern: "dist/type.js.map", included: false },
        { pattern: "src/**/*.js", included: false },

        "node_modules/expect.js/index.js",
        "node_modules/requirejs/require.js",
        "test/setup.js",

        { pattern: "test/stubs/**/*.js", included: false },
        "test/common/**/*.spec.js",
        "test/browser/**/*.spec.js"
    ],

    reporters: [ "progress" ],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    singleRun: false,

    browsers: [ "Chrome" ]

  });
};
