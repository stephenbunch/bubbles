module.exports = function( grunt )
{
    grunt.initConfig({
        pkg: grunt.file.readJSON( "package.json" ),

        // browserify: {
        //     dist: {
        //         files: {
        //             "dist/type.js": [ "src/type.js" ]
        //         },
        //         options: {
        //             debug: true,
        //             banner: "/*!\n" +
        //                 " * <%= pkg.name %> v<%= pkg.version %>\n" +
        //                 " * (c) 2013 Stephen Bunch https://github.com/stephenbunch/typejs\n" +
        //                 " * License: MIT\n" +
        //                 " */\n",
        //             sourceMap: "dist/type.map",
        //             postBundleCB: function( err, src, next )
        //             {
        //                 var path = require( "path" );
        //                 var options = grunt.config( "browserify" ).dist.options;
        //                 var lines = src.split( "\n" );
        //                 var map = lines.slice( lines.length - 2 ).join( "\n" );
        //                 grunt.file.write( options.sourceMap, map );

        //                 src = lines.slice( 0, lines.length - 2 ).join( "\n" ) + ";";
        //                 next( err, options.banner + "//@ sourceMappingURL=" + path.basename( options.sourceMap ) + "\n" + src );
        //             }
        //         }
        //     }
        // },

        browserify: {
            options: {
                banner: "/*! <%= pkg.name %> v<%= pkg.version %> */\n"
            },
            files: {
                "dist/type.min.js": [ "src/type.js" ]
            }
        },

        jshint: {
            options: {
                loopfunc: true
            },
            uses_defaults: [ "src/**/*.js", "spec/**/*.js" ]
        },

        // uglify: {
        //     options: {
        //         banner: "/*! <%= pkg.name %> v<%= pkg.version %> */\n"
        //     },
        //     dist: {
        //         src: "dist/type.js",
        //         dest: "dist/type.min.js"
        //     }
        // },

        jasmine: {
            all: {
                src: "dist/type.min.js",
                options: {
                    helpers: "spec/helpers.js",
                    specs: "spec/**/*.spec.js"
                }
            }
        },

        watch: {
            src: {
                files: [ "src/**/*.js" ],
                tasks: [ "browserify" ]
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

    grunt.registerTask( "browserify", function()
    {
        var browserify = require( "browserify" );
        var minifyify = require( "minifyify" );
        var config = grunt.config( "browserify" );
        var fs = require( "fs" );

        var b, out, stream;
        for ( out in config.files )
        {
            stream = fs.createWriteStream( out );
            b = browserify( config.files[ out ].map( function( path ) { return "./" + path; } ) );
            b.bundle({ debug: true }).pipe( minifyify() ).pipe( stream );
        }
    });

    grunt.registerTask( "default", [ "jshint", "browserify", "jasmine", "aplus" ] );
};
