var Delegate = function( method, scope )
{
    method = proxy( method, scope );
    method.valueOf = function()
    {
        Delegate.operands.push( this );
        return 3;
    };
    return method;
};
Delegate.operands = [];
