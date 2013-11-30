module.exports = function( grunt )
{
    grunt.initConfig({
        pkg: grunt.file.readJSON( "package.json" ),
        
        concat: {
            options: {
                banner: "/*!\n" +
                    " * <%= pkg.name %> v<%= pkg.version %>\n" +
                    " * (c) 2013 Stephen Bunch https://github.com/stephenbunch/typejs\n" +
                    " * License: MIT\n" +
                    " */\n"
            },
            dist: {
                src: [
                    "src/intro.js",
                    "src/helpers.js",
                    "src/type.js",
                    "src/errors.js",
                    "src/define.js",
                    "src/build.js",
                    "src/deferred.js",
                    "src/injector.js",
                    "src/util.js",
                    "src/outro.js"
                ],
                dest: "dist/type.js"
            }
        },

        jshint: {
            options: {
                loopfunc: true
            },
            uses_defaults: [ "dist/type.js", "spec/**/*.js" ]
        },

        uglify: {
            options: {
                banner: "/*! <%= pkg.name %> v<%= pkg.version %> */\n"
            },
            dist: {
                src: "dist/type.js",
                dest: "dist/type.min.js"
            }
        },

        jasmine: {
            all: {
                src: "dist/type.js",
                options: {
                    helpers: "spec/helpers.js",
                    specs: "spec/**/*.spec.js"
                }
            }
        },

        watch: {
            src: {
                files: [ "src/**/*.js" ],
                tasks: [ "concat" ]
            }
        }
    });

    grunt.loadNpmTasks( "grunt-contrib-jshint" );
    grunt.loadNpmTasks( "grunt-contrib-uglify" );
    grunt.loadNpmTasks( "grunt-contrib-concat" );
    grunt.loadNpmTasks( "grunt-contrib-watch" );
    grunt.loadNpmTasks( "grunt-contrib-jasmine" );

    grunt.registerTask( "aplus", function()
    {
        grunt.log.writeln( "Running Promise/A+ Tests" );
        var done = this.async();
        var run = require( "promises-aplus-tests" );
        var type = require( "./dist/type.js" );
        var adapter = {
            deferred: function()
            {
                var deferred = type.deferred();
                return {
                    promise: deferred.promise(),
                    resolve: deferred.resolve,
                    reject: deferred.reject
                };
            }
        };
        var options = {
            bail: true
        };
        run( adapter, options, function( err )
        {
            // All done; output is in the console. Or check `err` for number of failures.
            done();
        });
    });

    grunt.registerTask( "default", [ "concat", "jshint", "uglify", "jasmine", "aplus" ] );
};
