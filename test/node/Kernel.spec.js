describe( "Kernel", function()
{
    it( "should use `require` to load missing modules", function( done )
    {
        var kernel = type.Kernel();
        kernel.pathPrefix = __dirname + "/../stubs";
        kernel.get( "ns1.ns2.common" ).then( function( common )
        {
            expect( common.foo() ).to.equal( 2 );
            done();
        });
    });
});
