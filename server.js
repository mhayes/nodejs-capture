var express = require("express");
var phantom = require("phantom");
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var fs = require('fs');
var s3_sig= require('amazon-s3-url-signer');
var s3_config = require('./s3.json');
var app = express();


var bucket = s3_sig.urlSigner(s3_config.accessKeyId, s3_config.secretAccessKey, {});


AWS.config.loadFromPath('./s3.json');



var captureUrl = function(url, callback) {
  phantom.create(function(ph){
    ph.createPage(function(page) {
      page.set("viewportSize",{width: 1024, height: 768});
      page.open(url, function(status) {
        console.info(status);
        if (status === "success") {
          page.render("screen.png", function(){
            console.log("Screen Captured");
            callback("screen.png");
          });
        } else {
          callback(false);
        }
        ph.exit();
      });
    });
  });
};


app.get('/', function(req, res){
  res.send('zurb capture service');
});

app.get('/capture', function(req, res){
  var url = req.query.url;
  captureUrl(url, function(filename){
    // if (filename === false) res.send("failed...");
    res.send(filename);

    fs.readFile("./" + filename, function(err, data) {
      if (err) { throw err; }
      // var base64Data = new Buffer(data, 'binary').toString('base64');
      s3.putObject({
        Bucket: 'dev.capture.zurb',
        Key: 'screen.png',
        Body: data,
        ContentType: 'image/png'
      }, function(err, data) {
        if (err)
          console.log(err)
        else
          console.log("Successfully uploaded data...");
          var url = bucket.getUrl('GET', 'screen.png', 'dev.capture.zurb', 10);
          // res.send(url);
          console.log(url);
          // destroy the original file now
      });
    });



  });
});

app.listen(3000);
console.info('server started');


// node server.js
// GET http://localhost:3000/capture?url=http://zurb.com #=> {url: http://localhost:3000/capture/13}
// POST http://localhost:3000/capture

