require('should')
var Monitor = require('../lib/monitor.js').Monitor,
    sinon = require('sinon');

describe('Monitor', function(){

  it("shoulf be able to emit error when host not responding", function(done){
    var spy = sinon.spy();
    Monitor.on("error", spy)
    Monitor.pingHost("Label", "googleafhds98390284908239084908.pl");
    spy.called.should.equal.true;
  });

  it("shoulf be able to emit error when host not responding", function(done){
    var spy = sinon.spy();
    Monitor.on("ping", spy)
    Monitor.pingHost("Label", "google.pl");
    spy.called.should.equal.true;
  });



});
