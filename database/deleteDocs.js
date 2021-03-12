var express= require('express');
var app= express();
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://pavani:pavani123@ds117128.mlab.com:17128/healthcarebot";
app.get('/deleteAll',function(req,res){
    MongoClient.connect(url, function (err, client) {
        if (err) {
            console.log(err);
        }
        var db = client.db("healthcarebot");
        db.patients.deleteMany({ status : "A" })
    });

})
            