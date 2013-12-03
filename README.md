# Typeful [![Build Status](https://api.travis-ci.org/stephenbunch/typeful.png)](https://travis-ci.org/stephenbunch/typeful)

Be sure to check out the [wiki](../../wiki)!

Browser support: ![Internet Explorer](http://www.w3schools.com/images/compatible_ie2020.gif) 8+, ![Firefox](http://www.w3schools.com/images/compatible_firefox2020.gif) 4+, ![Chrome](http://www.w3schools.com/images/compatible_chrome2020.gif) 14+, ![Safari](http://www.w3schools.com/images/compatible_safari2020.gif) 5+ ![Opera](http://www.w3schools.com/images/compatible_opera2020.gif) 11.6+

## Download

```bash
$ git clone https://github.com/stephenbunch/typeful
$ bundle install
$ rackup
```

## Build
```bash
$ npm install
$ grunt
```

## Debug Tests
1. Run `node-inspector`
2. Run `node --debug-brk $(which grunt) mocha`
3. Launch http://127.0.0.1:8080/debug?port=5858 in Chrome.
