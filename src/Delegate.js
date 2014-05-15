var Delegate = function( method )
{
    method.valueOf = function()
    {
        Delegate.operands.push( this );
        return 3;
    }
    return method;
};
Delegate.operands = [];
