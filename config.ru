use Rack::Static, 
  :urls => [ "", "/src", "/test", "/dist", "/vendor" ],
  :index => 'index.html'

run lambda { |env| [ 200, { "Content-Type" => "text/html" } ] }
