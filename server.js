var express = require("express");
var phantom = require("phantom");
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var fs = require('fs');
var config = require('./config.json');
var app = express();

// Configure Amazon S3
AWS.config.update({accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey});

// Configure URL Signing for S3
var s3_sig= require('amazon-s3-url-signer');
var signer = s3_sig.urlSigner(config.accessKeyId, config.secretAccessKey, {});


var captureUrl = function(url, callback) {
  var filename = new Date().getTime() + ".png";
  phantom.create(function(ph){
    ph.createPage(function(page) {
      page.set("viewportSize",{width: 1024, height: 768});
      page.open(url, function(status) {
        console.info(status);
        if (status === "success") {
          page.render(filename, function(){
            callback(filename);
          });
        } else {
          callback(false);
        }
        ph.exit();
      });
    });
  });
};


app.get('/', function(req, res) {
  res.send('zurb capture service');
});

app.get('/capture', function(req, res){
  res.send({success: true});
  var url = req.query.url;
  captureUrl(url, function(filename){
    fs.readFile("./" + filename, function(err, data) {
      if (err) { throw err; }
      var key = 'phantomjs/' + filename;
      s3.putObject({
        Bucket: config.bucket,
        Key: key,
        Body: data,
        ContentType: 'image/png'
      }, function(err, data) {
        if (err) {
          console.log('unable to put file to s3')
        } else {
          fs.unlink('./' + filename);
          var url = signer.getUrl('GET', key, config.bucket, config.expires_in_mins);
          console.log(url);
        }
      });
    });
  });
});

app.get('/capture/:filename', function(req, res) {
  // can grep a file
  // filename: s3-url (line expires 1 hour later)
});

app.listen(3000);
console.info('server started');


// node server.js
// GET http://localhost:3000/capture?url=http://zurb.com #=> {url: http://localhost:3000/capture/13}
// POST http://localhost:3000/capture

