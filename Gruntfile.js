module.exports = function( grunt )
{
    grunt.initConfig({
        pkg: grunt.file.readJSON( "package.json" ),

        concat: {
            options: {
                banner: "/*!\n" +
                    " * <%= pkg.name %> v<%= pkg.version %>\n" +
                    " * (c) <%= new Date().getFullYear() %> <%= pkg.author.name %> <%= pkg.repository.url %>\n" +
                    " * License: <%= pkg.license %>\n" +
                    " */\n",
                sourceMap: true
            },
            dist: {
                src: [
                    "src/_head.js",
                    "src/error.js",
                    "src/constants.js",
                    "src/util.js",
                    "src/Class.js",
                    "src/Struct.js",
                    "src/Dictionary.js",
                    "src/Task.js",
                    "src/define/*.js",
                    "src/Type.js",
                    "src/compose/*.js",
                    "src/_exports.js",
                    "src/_tail.js"
                ],
                dest: "dist/type.js"
            }
        },

        jshint: {
            uses_defaults: [
                "src/error.js",
                "src/constants.js",
                "src/util.js",
                "src/Class.js",
                "src/Struct.js",
                "src/Dictionary.js",
                "src/Task.js",
                "src/define/*.js",
                "src/Type.js",
                "src/compose/*.js"
            ],
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
                tasks: [ "concat" ]
            }
        }
    });

    grunt.registerMultiTask( "concat", function()
    {
        var SourceMapGenerator = require( "source-map" ).SourceMapGenerator;
        var path = require( "path" );

        var options = this.options({
            banner: "",
            footer: "",
            sourceMap: false
        });
        
        var banner = grunt.template.process( options.banner );

        this.files.forEach( function( target )
        {
            var map = new SourceMapGenerator({
                file: path.basename( target.dest ),
                sourceRoot: "../"
            });
            var mapName = path.basename( target.dest, path.extname( target.dest ) ) + ".map";

            var src = banner;
            if ( options.sourceMap )
                src += "//@ sourceMappingURL=" + mapName + "\n";

            var offset = src.split( "\n" ).length - 1;

            src += target.src.map( function( path )
            {
                if ( grunt.file.exists( path ) )
                {
                    var src = grunt.file.read( path ) + "\n";
                    var lines = src.split( "\n" ).length - 1;
                    if ( options.sourceMap )
                    {
                        for ( var line = 1; line <= lines; line++ )
                        {
                            map.addMapping({
                                source: path,
                                original: {
                                    line: line,
                                    column: 0
                                },
                                generated: {
                                    line: line + offset,
                                    column: 0
                                }
                            });
                        }
                    }
                    offset += lines;
                    return src;
                }
                return "";
            }).join( "" );

            grunt.file.write( target.dest, src );

            if ( options.sourceMap )
                grunt.file.write( path.join( path.dirname( target.dest ), mapName ), map.toString() );
        });
    });

    grunt.registerTask( "aplus", function()
    {
        grunt.log.writeln( "Running Promise/A+ Tests" );
        var done = this.async();
        var run = require( "promises-aplus-tests" );
        var type = require( "./dist/type.js" );
        var adapter = {
            deferred: function() {
                return type.Task();
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

    grunt.registerTask( "browsertest", function()
    {
        grunt.log.writeln( "Running Browser Tests" );
        var done = this.async();
        var Mocha = require( "mocha" );
        var mocha = new Mocha({
            bail: true,
            grep: grunt.option( "grep" )
        });
        grunt.file.expand( "test/browser/**/*.spec.js" ).forEach( function( file )
        {
            mocha.addFile( file );
        });

        global.requirejs = require( "requirejs" );
        global.requirejs.config({
            baseUrl: "."
        });
        global.define = require( "amdefine" );
        global.require = require;
        global.type = require( "./dist/type.js" );
        global.expect = require( "expect.js" );

        mocha.run( function( failures ) {
            done( failures === 0 );
        });
    });

    grunt.registerTask( "nodetest", function()
    {
        grunt.log.writeln( "Running Node Tests" );
        var done = this.async();
        var Mocha = require( "mocha" );
        var mocha = new Mocha({
            bail: true,
            grep: grunt.option( "grep" )
        });
        grunt.file.expand( "test/node/**/*.spec.js" ).forEach( function( file )
        {
            mocha.addFile( file );
        });

        global.type = require( "./dist/type.js" );
        global.expect = require( "expect.js" );

        mocha.run( function( failures ) {
            done( failures === 0 );
        });
    });

    grunt.loadNpmTasks( "grunt-contrib-jshint" );
    grunt.loadNpmTasks( "grunt-contrib-uglify" );
    grunt.loadNpmTasks( "grunt-contrib-watch" );

    grunt.registerTask( "default", [ "jshint", "concat", "uglify", "browsertest", "nodetest", "aplus" ] );
};
