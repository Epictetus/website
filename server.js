var express = require('express')
  , io = require('socket.io')
  , util = require('util')
  , pub = __dirname + '/public'
  , port = process.env.PORT || 8000;

// express
var app = express.createServer();

// TODO: put this in a lib or push back to tj
(function() {
  var jade = require('jade')
    , content;

  jade.filters.content = function(str, options) {
    var k = Object.keys(options)[0]
      , v = jade.render(str.replace(/\\n/g, '\n'));
    if (content[k])
      content[k] += v;
    else
      content[k] = v;

    return '';
  };

  app.dynamicHelpers({
    content: function(req, res) {
      return content = {};
    }
  });
})();

// routes
app.get('/', function(req, res) {
  res.render('index');
});

[ 'about', 'how-to-win', 'sponsors' ].forEach(function(p) {
  app.get('/' + p, function(req, res) {
    res.render(p);
  });
});

// let 2010 routes redirect for a while
app.get(/\/(.*)\//, function(req, res, next) {
  var path = req.params[0];
  if (/^(stylesheets|javascripts|images|fonts)/.test(path)) {
    next(); // don't redirect for stylesheets and the like
  } else {
    res.redirect('http://2010.nodeknockout.com' + req.url, 301);
  }
});
app.listen(port);

// socket.io
var ws = io.listen(app);
ws.on('connection', function(client) {
  client
    .on('message', function(data) {
      data = JSON.parse(data);
      data.sessionId = client.sessionId;

      ws.broadcast(JSON.stringify(data), client.sessionId);
    })
    .on('disconnect', function() {
      ws.broadcast(JSON.stringify({
        sessionId: client.sessionId, disconnect: true
      }));
    });
});

util.log("listening on 0.0.0.0:" + port + ".");

// config
app.configure(function() {
  app.use(require('stylus').middleware(pub));
  app.use(express.logger());
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(express.static(pub));
  app.set('view options', { scope: { development: true }});
});

app.configure('production', function() {
  app.use(express.errorHandler());
  app.use(express.static(pub, { maxAge: 1000 * 5 * 60 }));
  app.set('view options', { scope: { development: false }});
});
