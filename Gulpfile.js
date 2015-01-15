var gulp = require( "gulp" );
var karma = require( "gulp-karma" )({
    configFile: "karma.conf.js"
});
var sequence = require( "run-sequence" );

gulp.task( "jshint", function()
{
    var jshint = require( "gulp-jshint" );
    var stylish = require( "jshint-stylish" );

    return gulp.src([ "src/*", "!src/_*" ])
    .pipe( jshint({ debug: true }) )
    .pipe( jshint.reporter( stylish ) )
    .pipe( jshint.reporter( "fail" ) );
});

gulp.task( "build", [ "jshint" ], function()
{
    var concat = require( "gulp-concat" );
    var filter = require( "gulp-filter" );
    var uglify = require( "gulp-uglify" );
    var sourcemaps = require( "gulp-sourcemaps" );
    var rename = require( "gulp-rename" );
    var order = require( "gulp-order" );
    var pkg = require( "./package.json" );
    var header = require( "gulp-header" );
    var ejs = require( "gulp-ejs" );

    var ejsFilter = filter( "**/*.ejs" );
    return gulp.src( "src/**/*" )
    .pipe( ejsFilter )
    .pipe( ejs({ pkg: pkg }, { ext: ".js" }) )
    .pipe( ejsFilter.restore() )
    .pipe(
        order([
            "_head.js",
            "error.js",
            "constants.js",
            "util.js",
            "Class.js",
            "Struct.js",
            "Dictionary.js",
            "Task.js",
            "define/*.js",
            "Type.js",
            "compose/*.js",
            "_exports.js",
            "_tail.js"
        ])
    )
    .pipe( sourcemaps.init() )
    .pipe( concat( "type.js" ) )
    .pipe(
        sourcemaps.write( ".", {
            includeContent: false,
            sourceRoot: '../src'
        })
    )
    .pipe( gulp.dest( "dist" ) )
    .pipe( filter( "type.js" ) )
    .pipe( uglify() )
    .pipe( rename( "type.min.js" ) )
    .pipe( header( "/*! <%= pkg.name %> v<%= pkg.version %> */\n", { pkg: pkg }) )
    .pipe( gulp.dest( "dist" ) );
});

gulp.task( "test:aplus", function( done )
{
    var run = require( "promises-aplus-tests" );
    var type = require( "./dist/type.js" );
    var adapter = {
        deferred: function() {
            return type.Task();
        }
    };
    var options = {
        bail: true,
        reporter: "dot"
    };
    run( adapter, options, function( err )
    {
        // All done; output is in the console. Or check `err` for number of failures.
        done();
    });
});

gulp.task( "test:node", function()
{
    var through2 = require( "through2" );
    var Mocha = require( "mocha" );

    global.type = require( "./dist/type" );
    global.expect = require( "expect.js" );

    var mocha = new Mocha({ bail: true });

    return gulp.src([
        "test/common/**/*.spec.js",
        "test/node/**/*.spec.js"
    ]).pipe(
        through2.obj( function( file, enc, cb )
        {
            mocha.addFile( file.path );
            cb( null, file );
        }, function( cb )
        {
            mocha.run( function( failures ) {
                if ( failures > 0 ) {
                    var err = new Error( "Test suite failed with " + failures + " failures." );
                    err.failures = failures;
                    cb( err );
                } else {
                    delete global.type;
                    delete global.expect;
                    cb( null );
                }
            });
        })
    );
});

gulp.task( "test:browser", function()
{
    return karma.once({
        browsers: [ "PhantomJS" ]
    });
});

gulp.task( "test", function( done ) {
    sequence([ "test:browser", "test:node" ], "test:aplus", done );
});

gulp.task( "karma", [ "build" ], function() 
{
    karma.start({ autoWatch: false, }).then( karma.run );
    gulp.watch([ "src/**/*", "test/**/*" ], [ "build", karma.run ]);
});

gulp.task( "watch", [ "build" ], function() {
    gulp.watch([ "src/**/*", "test/**/*" ], [ "build" ]);
});

gulp.task( "default", function( done ) {
    sequence( "build", "test", done );
});
