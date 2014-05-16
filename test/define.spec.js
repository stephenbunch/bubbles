describe( ".def()", function()
{
    it( "should throw an error when overriding a method that is not virtual", function()
    {
        var A = type.def({
            bar: function() {}
        });
        expect( function()
        {
            type.def({ extend: A }, {
                bar: function() {}
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });

    it( "should support the array syntax for specifing constructor dependencies", function( done )
    {
        var A = type.def({
            ctor: [ "bar", function( foo ) {
                this.foo = foo;
            }],
            value: function() {
                return this.foo;
            }
        });
        var kernel = type.Kernel();
        kernel.bind( "bar" ).to( function() { return 2; } );
        kernel.get( A ).then( function( a )
        {
            expect( a.value() ).to.equal( 2 );
            done();
        });
    });

    it( "should throw an error if the constructor is defined and no method is provided", function()
    {
        expect( function()
        {
            type.def({ ctor: null });
        }).to.throw( TypeError );
        expect( function()
        {
            type.def({ ctor: [ "foo", "bar" ] });
        }).to.throw( TypeError );
    });

    it( "should throw an error if a property's get accessor is not a method or null", function()
    {
        expect( function()
        {
            type.def({
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
            type.def({
                foo: {
                    get: function() {},
                    set: "bar"
                }
            });
        }).to.throw( TypeError );
    });

    it( "should throw an error if a property's read/write capabilities are redefined", function()
    {
        var A = type.def({
            $foo: {
                get: function() {}
            }
        });
        expect( function()
        {
            type.def({ extend: A }, {
                foo: {
                    set: function() {}
                }
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });

    it( "should throw an error if access modifers are specified for both property accessors", function()
    {
        expect( function()
        {
            var A = type.def({
                foo: {
                    __get: null,
                    __set: null
                }
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });

    it( "should throw an error if the parent constructor contains parameters and is not called from the child constructor", function()
    {
        var A = type.def({
            ctor: function( a ) {}
        });
        expect( function()
        {
            type.def({ extend: A }, {
                ctor: function() {}
            });
        }).to.throw( type.error( "DefinitionError" ) );
    });

    it( "should throw an error if members have already been defined", function()
    {
        var A = type.def();
        type.def( function()
        {
            var scope = this;
            scope.members({ foo: function() {} });
            expect( function()
            {
                scope.extend( A );
            }).to.throw( type.error( "DefinitionError" ) );
        });
    });

    it( "can extend native javascript types", function()
    {
        var A = function() {};
        A.prototype.foo = function() {
            return 2;
        };
        var B = type.def({ extend: A }, {});
        var b = new B();
        expect( b.foo() ).to.equal( 2 );
    });

    it( "can define one or more events", function()
    {
        var A = type.def({ events: [ "foo", "bar" ] }, {});
        var a = new A();

        expect( function() {
            a.foo();
        }).to.throw( type.error( "InvalidOperationError" ) );

        expect( function() {
            a.bar();
        }).to.throw( type.error( "InvalidOperationError" ) );
    });

    it( "can define one or more mixins", function()
    {
        var A = type.def({
            ctor: function() {
                this.message = "hello";
            },
            foo: function() {
                return this.message;
            }
        });
        var B = type.def({
            ctor: function() {
                this.message = " world";
            },
            bar: function() {
                return this.message;
            }
        });
        var C = type.def({ include: [ A, B ] }, {
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

    it( "should throw an error if mixin is not a type", function()
    {
        expect( function()
        {
            type.def({ include: [ function() {} ] }, {});
        }).to.throw( TypeError );
    });

    it( "should throw an error if the constructor has already been defined", function()
    {
        var A = type.def();
        type.def( function()
        {
            var scope = this;
            scope.members({ ctor: function() {} });
            expect( function()
            {
                scope.include([ A ]);
            }).to.throw( type.DefinitionError );
        });
    });
});
