describe( "Kernel", function()
{
    describe( ".bind()", function()
    {
        it( "should return a BindingSelector", function()
        {
            var kernel = type.kernel();
            var selector = kernel.bind( "foo" );
            expect( selector.to ).to.be.a( "function" );
        });

        it( "should throw an error if 'service' is empty", function()
        {
            var kernel = type.kernel();
            expect( function()
            {
                kernel.bind();
            }).to.throw( type.ArgumentError );
        });
    });

    describe( ".unbind()", function()
    {
        it( "should remove the binding for a service", function( done )
        {
            var e = new Error();
            var kernel = type.kernel();
            kernel.autoLoad( function( module )
            {
                return type.defer().reject( e );
            });
            kernel.bind( "foo" ).toConstant( 2 );
            kernel.resolve( "foo" ).then( function( foo )
            {
                expect( foo ).to.equal( 2 );
                kernel.unbind( "foo" );
                return kernel.resolve( "foo" );
            }).then( null, function( reason )
            {
                expect( reason ).to.equal( e );
                done();
            });
        });

        it( "can remove bindings of services with specific constraints", function( done )
        {
            var e = new Error();
            var kernel = type.kernel();
            kernel.autoLoad( function( module )
            {
                return type.defer().reject( e );
            });
            kernel.bind( "foo" ).toConstant( 2 ).whenFor([ "bar", "baz" ]);
            kernel.bind( "bar" ).to([ "foo", function( foo ) {} ]);
            kernel.bind( "baz" ).to([ "foo", function( foo ) {} ]);
            kernel.resolve( "bar" ).then( function()
            {
                kernel.unbind( "foo", [ "bar" ]);
                return kernel.resolve( "bar" );
            }).then( null, function( reason )
            {
                expect( reason ).to.equal( e );
                return kernel.resolve( "baz" );
            }).then( done );
        });
    });

    describe( ".resolve()", function()
    {
        it( "should support the array syntax for listing dependencies", function( done )
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            var out = 0;
            kernel.resolve( [ "foo", function( x )
            {
                out = x;
            }]).then( function()
            {
                expect( out ).to.equal( 2 );
                done();
            });
        });

        it( "should check the '$inject' property for an array listing dependencies", function( done )
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).to( function() {
                return 2;
            });
            var Bar = function( baz )
            {
                if ( !( this instanceof Bar ) )
                    return new Bar( baz );
                this.foo = baz;
            };
            Bar.$inject = [ "foo" ];
            kernel.resolve( Bar ).then( function( bar )
            {
                expect( bar.foo ).to.equal( 2 );
                return kernel.resolve( Bar );
            }).then( function( bar )
            {
                expect( bar.foo ).to.equal( 2 );
                done();
            });
        });

        it( "should throw an error if any dependencies are missing", function( done )
        {
            var e = new Error();
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                return type.defer().reject( e );
            });
            kernel.bind( "bar" ).to([ "foo", function() {} ]);
            kernel.resolve([ "bar", "baz", function() {} ]).then( null, function( reason )
            {
                expect( reason ).to.equal( e );
                done();
            });
        });

        it( "should reject the promise if the service loads as an empty string", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( "" );
                });
                return token.promise;
            });
            kernel.resolve( "foo" ).then( null, function( e )
            {
                expect( e ).to.be.instanceof( TypeError );
                done();
            });
        });

        it( "should reject the promise if the service loads as nothing", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve();
                });
                return token.promise;
            });
            kernel.resolve( "foo" ).then( null, function( e )
            {
                expect( e ).to.be.instanceof( TypeError );
                done();
            });
        });

        it( "should reject the promise if the service loads as an array, but the last element is not a function", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve([ "bla" ]);
                });
                return token.promise;
            });
            kernel.resolve( "foo" ).then( null, function( e )
            {
                expect( e ).to.be.instanceof( TypeError );
                done();
            });
        });
    });

    describe( ".autoBind()", function()
    {
        it( "should register an object graph by convention", function( done )
        {
            var called = 0;
            var graph = { bar: {} };
            graph.bar.Foo = type.define({
                ctor: function() {
                    called += 1;
                }
            });
            var kernel = type.kernel().autoBind({ app: graph });
            kernel.resolve( "app.bar.Foo" ).then( function()
            {
                expect( called ).to.equal( 1 );
                done();
            });
        });
    });

    describe( ".autoLoad()", function()
    {
        it( "can specify a base path to load missing services", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( "test/stubs" );
            kernel.resolve( "class1" ).then( function( class1 )
            {
                expect( class1.foo() ).to.equal( 2 );
                done();
            });
        });

        it( "should treat namespaces as path segments", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( "test/stubs" );
            kernel.resolve( "ns1.ns2.Class2" ).then( function( class2 )
            {
                expect( class2.bar() ).to.equal( 2 );
                done();
            });
        });
    });

    describe( "BindingSyntax", function()
    {
        describe( ".to()", function()
        {
            it( "should bind a service to a provider", function( done )
            {
                var kernel = type.kernel();
                kernel.bind( "foo" ).to( function() {
                    return 2;
                });
                kernel.resolve( "foo" ).then( function( foo )
                {
                    expect( foo ).to.equal( 2 );
                    done();
                });
            });
        });

        describe( ".toConstant()", function()
        {
            it( "should bind values as constants", function( done )
            {
                var kernel = type.kernel();
                var obj = {};
                kernel.bind( "foo" ).toConstant( obj );
                kernel.resolve( "foo" ).then( function( foo )
                {
                    expect( foo ).to.equal( obj );
                    done();
                });
            });
        });
    });

    describe( "BindingConfiguration", function()
    {
        describe( ".asSingleton()", function()
        {
            it( "should cause binding to resolve to the same instance", function( done )
            {
                var kernel = type.kernel();
                kernel.bind( "foo" ).to( function() { return {}; } ).asSingleton();
                var out;
                kernel.resolve( "foo" ).then( function( foo )
                {
                    out = foo;
                    return kernel.resolve( "foo" );
                }).then( function( foo )
                {
                    expect( foo ).to.equal( out );
                    done();
                });
            });
        });

        describe( ".whenFor()", function()
        {
            it( "should cause binding to resolve only when injected into one of the specified types", function( done )
            {
                var kernel = type.kernel();
                var out = null;
                kernel.bind( "foo" ).toConstant( 1 );
                kernel.bind( "foo" ).toConstant( 2 ).whenFor([ "bar" ]);
                kernel.bind( "foo" ).toConstant( 3 ).whenFor([ "bar" ]);
                kernel.bind( "foo" ).toConstant( 4 ).whenFor([ "baz" ]);
                kernel.bind( "bar" ).to([ "foo", function( foo )
                {
                    out = foo;
                }]);
                kernel.bind( "baz" ).to([ "foo", function( foo )
                {
                    out = foo;
                }]);

                // Bindings should be tried in reverse order.
                kernel.resolve( "bar" ).then( function()
                {
                    expect( out ).to.equal( 3 );
                    return kernel.resolve( "baz" );
                }).then( function()
                {
                    expect( out ).to.equal( 4 );

                    // Resolving an anonymous service should use the default binding if it exists.
                    return kernel.resolve([ "foo", function( foo ) {
                        out = foo;
                    }]);
                }).then( function()
                {
                    expect( out ).to.equal( 1 );
                    done();
                });
            });
        });
    });

    describe( "Factory", function()
    {
        it( "can be listed as a dependency", function( done )
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            kernel.resolve( type.factory( "foo" ) ).then( function( factory )
            {
                expect( factory() ).to.equal( 2 );
                done();
            });
        });

        it( "should forward additional arguments to the underlying service provider", function( done )
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).to( function( a ) { return a + 2; } );
            kernel.resolve( type.factory( "foo" ) ).then( function( factory )
            {
                expect( factory( 5 ) ).to.equal( 7 );
                done();
            });
        });

        it( "should not reuse dependencies", function( done )
        {
            var foo = 0;
            var bar = function() {};
            bar.$inject = [ "foo" ];
            var kernel = type.kernel();
            kernel.bind( "foo" ).to( function() {
                return ++foo;
            });
            kernel.bind( "bar" ).to( bar );
            kernel.resolve( type.factory( "bar" ) ).then( function( factory )
            {
                factory();
                factory();
                expect( foo ).to.equal( 2 );
                done();
            });
        });

        it( "should bind to a static dependency graph when resolved", function( done )
        {
            var calledA = 0;
            var calledB = 0;
            var kernel = type.kernel();
            kernel.bind( "foo" ).to( function() {
                calledA++;
                return 2;
            });
            kernel.resolve( type.factory( "foo" ) ).then( function( factory )
            {
                factory();
                kernel.unbind( "foo" );
                factory();
                kernel.bind( "foo" ).to( function()
                {
                    calledB++;
                    return 2;
                });
                factory();
                expect( calledA ).to.equal( 3 );
                expect( calledB ).to.equal( 0 );
                done();
            });
        });

        it( "should get the underlying service when being fetched", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function( module )
            {
                expect( module ).to.equal( "foo" );
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( function() { return 2; } );
                });
                return token.promise;
            });
            kernel.resolve( type.factory( "foo" ) ).then( function( fooFactory )
            {
                expect( fooFactory() ).to.equal( 2 );
                done();
            });
        });
    });

    describe( "Lazy", function()
    {
        it( "should behave as a Factory, but should return a Promise of an instance", function( done )
        {
            var kernel = type.kernel();
            kernel.bind( "foo" ).toConstant( 2 );
            kernel.resolve( type.lazy( "foo" ) ).then( function( lazy )
            {
                return lazy();
            }).then( function( value )
            {
                expect( value ).to.equal( 2 );
                done();
            });
        });

        it( "should resolve its dependency graph on the first call", function( done )
        {
            var kernel = type.kernel();
            kernel.autoLoad( function()
            {
                var token = type.defer();
                setTimeout( function()
                {
                    token.resolve( function() { return 2; } );
                });
                return token.promise;
            });
            kernel.resolve( type.lazy( "foo" ) ).then( function( lazy )
            {
                lazy()
                    .then( function( result )
                    {
                        expect( result ).to.equal( 2 );
                        kernel.autoLoad( function()
                        {
                            var token = type.defer();
                            setTimeout( function()
                            {
                                token.resolve( function() { return 3; } );
                            });
                            return token.promise;
                        });
                        return lazy();
                    })
                    .then( function( result )
                    {
                        expect( result ).to.equal( 2 );
                        kernel.bind( "foo" ).toConstant( 4 );
                        return lazy();
                    })
                    .then( function( result )
                    {
                        expect( result ).to.equal( 2 );
                        done();
                    });
            });
        });
    });
});
