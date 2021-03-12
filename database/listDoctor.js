module.exports = (params) => {
    var url = "mongodb://pavani:pavani123@ds117128.mlab.com:17128/healthcarebot"

    var MongoClient = require('mongodb').MongoClient;
    return new Promise(function (resolve, reject) {
        console.log("inside promise");
        MongoClient.connect(url, function (err, client) {
            if (err) {
                console.log(err);
                reject({response:'error'});
            }
            var db = client.db("healthcarebot");
            db.collection("doctors").find({ 'doctorName': params.doctorName }).toArray(function (err, data) {
                if (err) {
                    console.log(err);
                }
                else {
                    //console.log('result', data);
                    resolve({response:data});
                }

            })
        });
    })

}