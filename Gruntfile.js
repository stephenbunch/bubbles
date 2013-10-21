module.exports = function( grunt )
{
    grunt.initConfig({
        pkg: grunt.file.readJSON( 'package.json' ),
        
        concat: {
            options: {
                banner: '/*!\n' +
                    ' * <%= pkg.name %> v<%= pkg.version %>\n' +
                    ' * (c) 2013 Stephen Bunch https://github.com/stephenbunch/typejs\n' +
                    ' * License: MIT\n' +
                    ' */\n'
            },
            dist: {
                src: [
                    'src/intro.js',
                    'src/type.js',
                    'src/misc.js',
                    'src/build.js',
                    'src/inject.js',
                    'src/util.js',
                    'src/outro.js'
                ],
                dest: 'dist/type.js'
            }
        },

        jshint: {
            dist: [ 'dist/type.js' ],
            test: [ 'spec/**/*.js' ]
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> */\n'
            },
            dist: {
                src: 'dist/type.js',
                dest: 'dist/type.min.js'
            }
        },

        jasmine: {
            all: {
                src: 'dist/type.js',
                options: {
                    specs: 'spec/**/*.spec.js'
                }
            }
        },

        watch: {
            src: {
                files: [ 'src/**/*.js' ],
                tasks: [ 'concat' ]
            }
        }
    });

    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-contrib-watch' );
    grunt.loadNpmTasks( 'grunt-contrib-jasmine' );

    grunt.registerTask( 'default', [ 'concat', 'jshint', 'uglify', 'jasmine' ] );
};
