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
            }).toThrow();
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
            var injector = type.injector().register( "bar", function() { return 2; } );
            var a = injector.resolve( A );
            expect( a.value() ).toBe( 2 );
        });

        it( "should auto fill base type dependencies when '...' is the first element", function()
        {
            var A = type().def({
                ctor: [ "foo", function( foo, bar )
                {
                    this.foo = foo;
                    this.bar = bar;
                }],
                foo: null,
                bar: null
            });
            var B = type().extend( A ).def({
                ctor: [ "...", "baz", function( foo, baz, bar, qux )
                {
                    this._super( foo, bar );
                    this.baz = baz;
                    this.qux = qux;
                }],
                baz: null,
                qux: null
            });
            var injector = type.injector().constant({
                foo: 1,
                baz: 3
            });
            var b = injector.resolve( B, 2, 4 );
            expect( b.foo ).toBe( 1 );
            expect( b.bar ).toBe( 2 );
            expect( b.baz ).toBe( 3 );
            expect( b.qux ).toBe( 4 );
        });

        it( "should throw an error if the constructor is defined and no method is provided", function()
        {
            expect( function()
            {
                type().def({ ctor: null });
            }).toThrow();
            expect( function()
            {
                type().def({ ctor: [ "foo", "bar" ] });
            }).toThrow();
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
            }).toThrow();
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
            }).toThrow();
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
            }).toThrow();
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
            }).toThrow();
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
            }).toThrow();
        });

        it( "should accept strings", function()
        {
            type( "A" ).def({ foo: 2 });
            type( "B" ).extend( "A" );
            var b = type( "B" )();
            expect( b.foo ).toBe( 2 );
            type.destroy( "A" );
            type.destroy( "B" );
        });

        it( "can extend native javascript types", function()
        {
            var A = function() {};
            A.prototype.foo = function() {
                return 2;
            };
            var B = type().extend( A );
            var b = new B();
            expect( b.foo() ).toBe( 2 );
        });

        it( "should throw an error if a circular reference is created", function()
        {
            var A = type();
            expect( function()
            {
                A.extend( A );
            }).toThrow();

            var B = type().extend( A );
            expect( function()
            {
                A.extend( B );
            }).toThrow();

            var C = type().extend( B );
            expect( function()
            {
                A.extend( C );
            }).toThrow();
        });
    });

    describe( ".events()", function()
    {
        it( "can define one or more events", function()
        {
            var A = type().events([ "foo", "bar" ]);
            var a = new A();
            expect( a.foo.addHandler ).toBeDefined();
            expect( a.foo.removeHandler ).toBeDefined();
            expect( a.bar.addHandler ).toBeDefined();
            expect( a.bar.removeHandler ).toBeDefined();
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
            expect( c.baz() ).toBe( "hello world!" );
        });

        it( "should throw an error if a circular reference is created", function()
        {
            var A = type();
            expect( function()
            {
                A.include([ A ]);
            }).toThrow();

            var B = type().include([ A ]);
            expect( function()
            {
                A.include([ B ]);
            }).toThrow();

            var C = type().include([ B ]);
            expect( function()
            {
                A.include([ C ]);
            }).toThrow();
        });

        it( "should throw an error if a mixin has dependencies", function()
        {
            var A = type().def({
                ctor: function( x ) { }
            });
            var B = type();
            expect( function()
            {
                B.include([ A ]);
            }).toThrow();
        });

        it( "should throw an error if mixin is not a type", function()
        {
            var A = type();
            expect( function()
            {
                A.include([ function() {} ]);
            }).toThrow();
        });
    });

    describe( ".$scope", function()
    {
        it( "should return undefined", function()
        {
            var A = type();
            var a = new A();
            expect( a.$scope() ).toBe( undefined );
        });
    });
});
