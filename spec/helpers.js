beforeEach( function()
{
    this.addMatchers({
        toThrowOf: function( error )
        {
            if ( typeof this.actual != "function" )
                throw new Error( "Actual is not a Function." );
            if ( !( error.prototype instanceof Error ) )
                throw new Error( "Error is not an error." );

            var not = this.isNot ? "not " : "";
            try
            {
                this.actual();
                this.message = function() {
                    return "Expected function to " + not + "throw an exception of type " + error.prototype.name + ".";
                };
                return !this.isNot;
            }
            catch ( ex )
            {
                this.message = function() {
                    return "Expected function to " + not + "throw " + error.prototype.name + ", but it threw " + ex.name + ".";
                };
                if ( this.isNot )
                    return !( ex instanceof error );
                else
                    return ex instanceof error;
            }
        }
    });
});
