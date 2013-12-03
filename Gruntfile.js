module.exports = function( grunt )
{
    grunt.initConfig({
        pkg: grunt.file.readJSON( "package.json" ),

        browserify: {
            dist: {
                files: {
                    "dist/type.js": [ "src/type.js" ]
                },
                options: {
                    debug: true,
                    banner: "/*!\n" +
                        " * <%= pkg.name %> v<%= pkg.version %>\n" +
                        " * (c) 2013 Stephen Bunch https://github.com/stephenbunch/typeful\n" +
                        " * License: MIT\n" +
                        " */\n",
                    sourceMap: "dist/map.json",
                    postBundleCB: function( err, src, next )
                    {
                        if ( !src )
                        {
                            next( err, src );
                            return;
                        }
                        var path = require( "path" );
                        var options = grunt.config( "browserify" ).dist.options;
                        var lines = src.split( "\n" );

                        var map = lines.splice( lines.length - 2, 1 )[0];
                        map = map.substr( "//@ sourceMappingURL=data:application/json;base64,".length );
                        map = new Buffer( map, "base64" ).toString( "binary" );
                        map = JSON.parse( map );
                        map.sources = map.sources.map( function( source ) {
                            return source.substr( __dirname.length + 1 );
                        });
                        map = JSON.stringify( map );
                        grunt.file.write( options.sourceMap, map );

                        src = lines.join( "\n" );
                        next( err, options.banner + "//@ sourceMappingURL=" + path.basename( options.sourceMap ) + "\n" + src );
                    }
                }
            }
        },

        jshint: {
            options: {
                loopfunc: true
            },
            uses_defaults: [ "src/**/*.js" ],
            with_overrides: {
                options: {
                    expr: true
                },
                files: {
                    src: [ "test/**/*.js" ]
                }
            }
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

        watch: {
            src: {
                files: [ "src/**/*.js" ],
                tasks: [ "browserify" ]
            }
        }
    });

    grunt.registerTask( "aplus", function()
    {
        grunt.log.writeln( "Running Promise/A+ Tests" );
        var done = this.async();
        var run = require( "promises-aplus-tests" );
        var type = require( "./src/type.js" );
        var adapter = {
            deferred: function() {
                return type.defer();
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

    grunt.registerTask( "mocha", function()
    {
        grunt.log.writeln( "Running All Tests" );
        var done = this.async();
        var Mocha = require( "mocha" );
        var mocha = new Mocha({
            bail: true,
            grep: grunt.option( "grep" )
        });
        grunt.file.expand( "test/**/*.js" ).forEach( function( file )
        {
            mocha.addFile( file );
        });
        mocha.run( function( failures ) {
            done( failures === 0 );
        });
    });

    grunt.loadNpmTasks( "grunt-contrib-jshint" );
    grunt.loadNpmTasks( "grunt-contrib-uglify" );
    grunt.loadNpmTasks( "grunt-contrib-concat" );
    grunt.loadNpmTasks( "grunt-contrib-watch" );
    grunt.loadNpmTasks( "grunt-browserify" );

    grunt.registerTask( "default", [ "jshint", "browserify", "uglify", "mocha", "aplus" ] );
};
