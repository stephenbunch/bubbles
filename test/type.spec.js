var type = require( "../src/type" );
var expect = require( "chai" ).expect;

describe( "type", function()
{
    describe( ".def()", function()
    {
        it( "should throw an error when overriding a method that is not virtual", function()
        {
            var A = type().def({
                bar: function() {}
            });
            expect( function()
            {
                A.def({
                    bar: function() {}
                });
            }).to.throw( type.DefinitionError );
        });

        it( "should support the array syntax for specifing constructor dependencies", function()
        {
            var A = type().def({
                ctor: [ "bar", function( foo )
                {
                    this.foo = foo;
                }],
                value: function()
                {
                    return this.foo;
                }
            });
            var injector = type.injector();
            injector.bind( "bar" ).to( function() { return 2; } );
            var a = injector.resolve( A ).value();
            expect( a.value() ).to.equal( 2 );
        });

        it( "should throw an error if the constructor is defined and no method is provided", function()
        {
            expect( function()
            {
                type().def({ ctor: null });
            }).to.throw( TypeError );
            expect( function()
            {
                type().def({ ctor: [ "foo", "bar" ] });
            }).to.throw( TypeError );
        });

        it( "should throw an error if a property's get accessor is not a method or null", function()
        {
            expect( function()
            {
                type().def({
                    foo: {
                        get: "bar",
                        set: function() {}
                    }
                });
            }).to.throw( TypeError );
        });

        it( "should throw an error if a property's set accessor is not a method or null", function()
        {
            expect( function()
            {
                type().def({
                    foo: {
                        get: function() {},
                        set: "bar"
                    }
                });
            }).to.throw( TypeError );
        });

        it( "should throw an error if a property's read/write capabilities are redefined", function()
        {
            var A = type().def({
                $foo: {
                    get: function() {}
                }
            });
            var B = type().extend( A );
            expect( function()
            {
                B.def({
                    foo: {
                        set: function() {}
                    }
                });
            }).to.throw( type.DefinitionError );
        });

        it( "should throw an error if access modifers are specified for both property accessors", function()
        {
            expect( function()
            {
                var A = type().def({
                    foo: {
                        __get: null,
                        __set: null
                    }
                });
            }).to.throw( type.DefinitionError );
        });

        it( "should throw an error if the parent constructor contains parameters and is not called from the child constructor", function()
        {
            var A = type().def({
                ctor: function( a ) {}
            });
            var B = type().extend( A );
            expect( function()
            {
                B.def({
                    ctor: function() {}
                });
            }).to.throw( type.DefinitionError );
        });
    });

    describe( ".extend()", function()
    {
        it( "should throw an error if members have already been defined", function()
        {
            var A = type();
            var B = type().def({ foo: function() {} });
            expect( function()
            {
                B.extend( A );
            }).to.throw( type.DefinitionError );
        });

        it( "can extend native javascript types", function()
        {
            var A = function() {};
            A.prototype.foo = function() {
                return 2;
            };
            var B = type().extend( A );
            var b = new B();
            expect( b.foo() ).to.equal( 2 );
        });

        it( "should throw an error if a circular reference is created", function()
        {
            var A = type();
            expect( function()
            {
                A.extend( A );
            }).to.throw( type.DefinitionError );

            var B = type().extend( A );
            expect( function()
            {
                A.extend( B );
            }).to.throw( type.DefinitionError );

            var C = type().extend( B );
            expect( function()
            {
                A.extend( C );
            }).to.throw( type.DefinitionError );
        });
    });

    describe( ".events()", function()
    {
        it( "can define one or more events", function()
        {
            var A = type().events([ "foo", "bar" ]);
            var a = new A();
            expect( a.foo.addHandler ).to.be.a( "function" );
            expect( a.foo.removeHandler ).to.be.a( "function" );
            expect( a.bar.addHandler ).to.be.a( "function" );
            expect( a.bar.removeHandler ).to.be.a( "function" );
        });
    });

    describe( ".include()", function()
    {
        it( "can define one or more mixins", function()
        {
            var A = type().def({
                ctor: function() {
                    this.message = "hello";
                },
                foo: function() {
                    return this.message;
                }
            });
            var B = type().def({
                ctor: function() {
                    this.message = " world";
                },
                bar: function() {
                    return this.message;
                }
            });
            var C = type().include([ A, B ]).def({
                ctor: function() {
                    this.message = "!";
                },
                baz: function() {
                    return this.foo() + this.bar() + this.message;
                }
            });
            var c = new C();
            expect( c.baz() ).to.equal( "hello world!" );
        });

        it( "should throw an error if a circular reference is created", function()
        {
            var A = type();
            expect( function()
            {
                A.include([ A ]);
            }).to.throw( type.DefinitionError );

            var B = type().include([ A ]);
            expect( function()
            {
                A.include([ B ]);
            }).to.throw( type.DefinitionError );

            var C = type().include([ B ]);
            expect( function()
            {
                A.include([ C ]);
            }).to.throw( type.DefinitionError );
        });

        it( "should throw an error if mixin is not a type", function()
        {
            var A = type();
            expect( function()
            {
                A.include([ function() {} ]);
            }).to.throw( TypeError );
        });

        it( "should throw an error if the constructor has already been defined", function()
        {
            var A = type();
            var B = type().def({
                ctor: function() {}
            });
            expect( function()
            {
                B.include([ A ]);
            }).to.throw( type.DefinitionError );
        });
    });

    describe( ".$scope", function()
    {
        it( "should return undefined", function()
        {
            var A = type();
            var a = new A();
            expect( a.$scope() ).to.be.undefined;
        });
    });
});