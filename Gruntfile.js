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
                        " * (c) 2013 Stephen Bunch https://github.com/stephenbunch/typejs\n" +
                        " * License: MIT\n" +
                        " */\n",
                    sourceMap: "dist/type.map",
                    postBundleCB: function( err, src, next )
                    {
                        if ( !src )
                        {
                            next( err, src );
                            return;
                        }
                        var path = require( "path" );
                        var convert = require( "convert-source-map" );
                        var options = grunt.config( "browserify" ).dist.options;
                        var map = convert.fromSource( src ).toObject();
                        map.file = "type.js";
                        map.sources = map.sources.map( function( source ) {
                            return "../" + source.substr( __dirname.length + 1 );
                        });
                        map.sourcesContent = [];
                        var offset = "", i;
                        for ( i = 0; i < options.banner.split( "\n" ).length; i++ )
                            offset += ";";
                        map.mappings = offset + map.mappings;
                        grunt.file.write( options.sourceMap, JSON.stringify( map ) );
                        next( err, options.banner + "//@ sourceMappingURL=" + path.basename( options.sourceMap ) + "\n" + convert.removeComments( src ) );
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
        grunt.file.expand( "test/**/*.spec.js" ).forEach( function( file )
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
