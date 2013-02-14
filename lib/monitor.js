var http = require('http'),
    exec = require('child_process').exec,
    nodemailer = require("nodemailer"),
    events = require('events'),
    util = require('util'),
    mailer_credentials = require(process.env.HOME + '/.auth.json').notifier;

function Monitor(){
  var self = this;

  events.EventEmitter.call(this);

  this.hosts = {
    'DNS Server': '10.0.0.215',
    'CRM RC'    : 'crm.rc.edp',
    'CRM Work'  : 'crm.w.edp',
    'CRM Prod'  : 'crm.pl.edp',
    'Jenikins'  : 'ci.w.edp',
    'CRM RC IP'    : '10.0.0.222',
    'CRM Work IP'  : '10.0.0.221',
    'CRM Prod IP'  : '10.0.0.217',
    'DUPA1'      : '10.0.0.91',
    'DUPA2'      : '10.0.0.90',
    'DUPA3'      : '10.0.0.92'
  };

  this.dns = {
    'Old First' : "10.0.0.215",
    'New First' : "10.0.0.214",
    'New Second': "10.0.0.213",
    'New Third' : "10.0.0.216"
  }


  this.sites = {
    'qarson' : 'http://www.qarson.fr',
    'edpauto' : 'http://www.edpauto.fr'
  };


  this.transport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: mailer_credentials
  });

  this.errors = [];

  this.minErrorToSendEmail = 3;
}

util.inherits(Monitor, events.EventEmitter);

Monitor.prototype.alert = function (msg) {
  var command = "DISPLAY=:0.0 /usr/bin/notify-send -u critical -i /usr/share/icons/Faenza/status/scalable/error.svg 'Something sucks!'  '" +
    msg.replace("'"," ") +
    "' ";

  exec(command,function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  });



};


Monitor.prototype.sendEmail = function(subject, message) {
  var self = this;
  this.transport.sendMail({
      to: "jacek.wysocki@gmail.com",
      subject: subject,
      text: message,
      headers : {
        "X-EDP-Application" : "Monitor Emailer"
      }
    },
    function(error, responseStatus){
       console.log( error );
       if(!error){

         self.emit("debug", {
           message: "Received message fro SMTP server: " + responseStatus.message +
             " (Email messageId: " + responseStatus.messageId
         });
       }

      self.transport.close();
    });
}

Monitor.prototype.cleanErrors = function() {
  this.errors = [];
}

Monitor.prototype.pushError = function (error) {
  this.errors.push(error);

  if(this.errors.length >= this.minErrorToSendEmail) {
    this.emit("sendEmail", this.errors);
  }
}

Monitor.prototype.checkSite = function (label, url, callback) {
  var self = this;

  http.get(url, function(res) {
    if(res.statusCode > 300) {
      self.emit("error", {
        message: "Site " + label + " responded with code: " + res.statusCode + " (" + url + ")"
      });
    }

    self.emit("httpResponse", {status: res.statusCode, site: label});
  }).on('error', function(e) {
    self.emit("error", {
      message: "Received HTTP error message: " + e.message
    });
  });
};

Monitor.prototype.pingHost = function (label, url) {
  var self = this;
  exec("ping -c 1 " + url, function (error, stdout, stderr) {
    self.emit("ping", {
      message: "Pinging host: " + url
    });

    if (error !== null) {
      self.emit("error", {
        message: label + " doesn't responding to ping requests!"
      });
    }
  });
};

Monitor.prototype.checkDNSes = function () {
  var self = this;

  for (var k in this.dns){
    self.emit("debug", "Checking DNS " + k);
    this.pingHost(k, this.dns[k]);
  }
};

Monitor.prototype.checkHosts = function () {
  for (var k in this.hosts){
    this.emit("debug", "Pinging host " + k);
    this.pingHost(k, this.hosts[k]);
  }
};

Monitor.prototype.checkSites = function () {
  for(var k in this.sites) {
    this.emit("debug", "Querying site: " + k);
    this.checkSite(k, this.sites[k]);
  }
};


var M = new Monitor();

M.on("error", function(e) {
  M.pushError(e);
  M.alert(e.message);
  console.log("[Error] %s", e.message);
});

M.on("sendEmail", function (errors) {
  M.sendEmail("Monitor errors", errors.reduce(function(p,c){ return p + c.message + "\n\n" }, ""));
  M.cleanErrors();
  console.log();
});

M.on("debug", function (mess) {
  console.log("[Debug] %s", mess);
});


M.on("httpResponse", function (mess) {
  console.log("[http] Site %s returns response code: %s", mess.site, mess.status);
});

module.exports.Monitor = M;
