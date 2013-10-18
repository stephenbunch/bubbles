describe( "type.def", function()
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
