module.exports = function( grunt )
{
    grunt.initConfig({
        pkg: grunt.file.readJSON( 'package.json' ),
        
        concat: {
            options: {
                banner: '/*!\n' +
                    ' * <%= pkg.name %> v<%= pkg.version %>\n' +
                    ' * (c) 2013 Stephen Bunch https://github.com/stephenbunch/bubbles\n' +
                    ' * License: MIT\n' +
                    ' */\n'
            },
            dist: {
                src: [
                    'src/intro.js',
                    'src/helpers.js',
                    'src/utils.js',
                    'src/type.js',
                    'src/app.js',
                    'src/hub.js',
                    'src/bubble.js',
                    'src/outro.js'
                ],
                dest: 'dist/bubbles.js'
            }
        },

        jshint: {
            dist: [ 'dist/bubbles.js' ]
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> */\n'
            },
            dist: {
                src: 'dist/bubbles.js',
                dest: 'dist/bubbles.min.js'
            }
        },

        qunit: {
            all: [ 'test/**/*.html' ]
        },

        watch: {
            src: {
                files: [ 'src/**/*.js' ],
                tasks: [ 'concat' ]
            }
        }
    });

    grunt.loadNpmTasks( 'grunt-contrib-qunit' );
    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-contrib-watch' );

    grunt.registerTask( 'default', [ 'concat', 'jshint', 'uglify', 'qunit' ] );
};
