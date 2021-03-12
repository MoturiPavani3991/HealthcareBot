var http = require("http");
var env = require('node-env-file');
env(__dirname + '/.env');
const request = require('request-promise')
var MongoClient = require('mongodb').MongoClient;
var express = require("express");
var unirest = require('unirest');
var app = express();
var bp = require('body-parser');
let date = require('date-and-time');
var convertTime = require('convert-time');
var hourConvert = require('hour-convert');
var zipcodes = require('zipcodes');
var listDoctor = require('./database/listDoctor');
var listappointment = require('./database/listappointment');
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
    apiKey: 'c56a5b98',
    apiSecret: '62whGnpn4wqiptnK'
  })
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
var mongo = require('mongodb').MongoClient;
var url = "mongodb://pavani:pavani123@ds117128.mlab.com:17128/healthcarebot";
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
app.get('/', function (req, res) {
    res.send({ "name": "pavani" });
})
app.get('/timeSlot',function(req,res){
    var msg;
    console.log("req.query",req.query);
    console.log("typeof(req.query)",typeof(req.query));
    var t = req.query.time
    var time = req.query.date + "T" + t + ":00.0000000Z";
    listDoctor({'doctorName':req.query.doctorName}).then((resp)=>{
       // console.log('resp',resp);
        var id = resp.response[0].doctorID
        unirest.get('https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments')
        .headers({ 'Authorization': process.env.token })
        .end(function (response) {
            //console.log("response.body.value[0]",response.body.value[0]);
            r = response.body.value;
            console.log("r value",r.length);
        if(r.length!= 0)
        {
        
            for (var i = 0; i < r.length; i++) {
            if(r[i].start.dateTime == time    && r[i].staffMemberIds == id  )
            {
                console.log({"msg":"busy"})
               //  res.send({"msg":"busy"})
                msg= "busy";
                break;
            }
            else
            {
                console.log({"msg":"free"});
               //  res.send({"msg":"free"})
                msg ="free";

            }
            }  setTimeout(() => {
                 res.send({"msg":msg})
            }, 2000);

            

        }
        else
        {
           // console.log({"msg":"free"});
            res.send({"msg":"free"})



        }
           
        });
    })
})
app.get('/listDoctorsFromZipcodes', function (req, res) {
    var nearDoctors = [];
    console.log("req.query from listDoctorsFromZipcodes", req.query);
    var rad = zipcodes.radius(req.query.zipcode, 4);
    var zipDistance = [];
    console.log('rad', rad);
    console.log('typeof(rad[0])', typeof (rad[0]))
    console.log("rad[0]", rad[0]);
    console.log("rad.length", rad.length);
    for (var i = 0; i < rad.length; i++) {
        var dist = zipcodes.distance(req.query.zipcode, rad[i]);
        zipDistance.push(dist);
    }
    var index = rad.indexOf(req.query.zipcode);
    if (index > -1) {
        rad.splice(index, 1);
    }
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        if (req.query.Gender == 'No') {
            var query = {
                $and: [
                    { 'specialization': req.query.specialization },
                    {
                        $or: [
                            { zipcode: { $in: rad } }
                        ]
                    }
                ]
            };

        }
        else
            var query =
            {
                $and: [
                    { 'gender': req.query.Gender },
                    { 'specialization': req.query.specialization },
                    {
                        $or: [
                            { zipcode: { $in: rad } }
                        ]
                    }
                ]

            }
        var dbo = db.db("healthcarebot");
        dbo.collection("doctors").find(query).toArray(function (err, result) {

            if (err) throw err;
            for (var i = 0; i < rad.length; i++) {
                for (var j = 0; j < result.length; j++) {
                    if (result[j].zipcode === rad[i]) {
                        result[j].distance = zipDistance[i]
                    }
                }
            }
            console.log("zipDistance", zipDistance);
            console.log("result[0]", result);
            res.send(result);
        });


    });
})
app.get('/listSpecialization', function (req, res) {
    res.send([
        { "title": "Cosmetic Dentist", "value": "Cosmetic Dentist" },
        { "title": "General Dentist", "value": "General Dentist" },
        { "title": "Orthodontist", "value": "Orthodontist" },
        // { "title": "Cardiology", "value": "Cardiology" },
        // { "title": "Dermatology", "value": "Dermatology" },
        // { "title": "Neurology", "value": "Neurology" }
    ]);

    // res.send([
    //     { "title": "Cardiology", "value": "Cardiology" },
    //     { "title": "Dermatology", "value": "Dermatology" },
    //     { "title": "Neurology", "value": "Neurology" },
    //     { "title": "Gynecology", "value": "Gynecology" },
    //     { "title": "Anesthesiology", "value": "Anesthesiology" },
    //     { "title": "Ophthalmology", "value": "Ophthalmology" },
    //     { "title": "Hematology", "value": "Hematology" },
    //     { "title": "Pathology ", "value": "Pathology" }]);
})
app.get('/insuranceCheck', function (req, res) {
    console.log('InsuranceCheck : req.query', req.query);
    var email = req.query.email;
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("healthcarebot");
        var query = { "email": req.query.email };
        dbo.collection("patients").find(query).toArray(function (err, result) {
            console.log(result);
            if (err) throw err;
            else {
                if (result.length == 0) {
                    res.send({ "status": false })
                }
                else {
                    if (result[0].insuranceID == null || result[0].insuranceProvider == null || result[0].groupId == null) {
                        res.send({ "status": false })
                    }
                    else {
                        res.send({ "status": true, "insuranceProvider": result[0].insuranceProvider, "insuranceID": result[0].insuranceID, "groupId": result[0].groupId })
                    }

                }
                db.close();
            }
        });
    });
})

app.get('/updateAppointment', function (req, res) {
    console.log("query", req.query);
    var r;
    var staff,doctor,phone,patientName;
    var state = true;
    console.log("Update Appointment : req.query", req.query);
    unirest.get('https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments')
        .headers({ 'Authorization': process.env.token })
        .end(function (response) {
            r = response.body.value;
            for (var i = 0; i < r.length; i++) {
                var x = r[i].customerEmailAddress;
                var y = req.query.email;
                console.log("req.query.id", req.query.id);
                console.log(x, y);
                if (r[i].id == req.query.id) 
                {
                    id = req.query.id
                    staff =r[i].staffMemberIds[0]
                    phone = r[i].customerPhone
                    patientName = r[i].customerName
                    console.log("id", id);
                    var time = req.query.time;
                    var t = time.substring(0, 2);
                    t = Number(t) + 1;
                    let now = new Date(req.query.date);
                    var date1 = date.format(now, 'MM-DD-YYYY HH:mm:ss');
                    var finalDate = date1.substring(0, 10);
                    console.log("finalDate", finalDate);
                    var finalTime = convertTime(time);
                    console.log("req.query.date", req.query.date);
                    var time2 = req.query.date + "T" + t + ":00:00.0000000Z";
                    var time1 = req.query.date + "T" + time + ":00.0000000Z";

                    listappointment({ "doctorID":staff }).then((resp) => {
                        doctor= resp.response[0].doctorName;

                    });
                    const options = {
                        method: 'PATCH',
                        uri: 'https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments/' + id,
                        body: {
                            "@odata.type": "#microsoft.graph.bookingAppointment",
                            "end": {
                                "@odata.type": "#microsoft.graph.dateTimeTimeZone",
                                "dateTime": time2,
                                "timeZone": "UTC"
                            },
                            "invoiceDate": {
                                "@odata.type": "#microsoft.graph.dateTimeTimeZone",
                                "dateTime": time1,
                                "timeZone": "UTC"
                            },
                            "start": {
                                "@odata.type": "#microsoft.graph.dateTimeTimeZone",
                                "dateTime": time1,
                                "timeZone": "UTC"
                            },
                            "serviceName": req.query.reason
                        },
                        json: true,
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': process.env.token
                        }
                    }
                    request(options)
                        .then(response1 => {
                            console.log("Inside request");
                            var message = 'Your appointment with '+doctor+' has been successfully Updated to '+finalDate +'at '+finalTime +" ."
                            const From = '16466998290'
                            var To = "1" + phone;
                            nexmo.message.sendSms(
                                From, To, message,
                                (err, responseData) => {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        console.log(responseData);
                                    }
                                }
                            );
                            state = false;
                            
                            res.send({ "status": true, "date": finalDate, "finalTime": finalTime ,"patientName" :patientName,"serviceName": req.query.reason})
                        })

                    break;
                }
                
            }
            setTimeout(() => {
                if (state) {
                    console.log("into false", state)
                    res.send({ "status": false })
                }
            }, 3000);
        });
})
app.get('/deleteAppointment', function (req, res) {
    console.log("deleteAppointment : req.query", req.query);
    var r, id,staffId,phone;
    var state = true;
    console.log(state);
    unirest.get('https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments')
        .headers({ 'Authorization': process.env.token })
        .end(function (response) {
            r = response.body.value;
            console.log("r", r);
            for (var i = 0; i < r.length; i++) {
                console.log("req.query.id", req.query.id);
                console.log("r[i].id", r[i].id);
                if (r[i].id == req.query.id) {
                    staffId = r[i].staffMemberIds[0] 
                    phone = r[i].customerPhone;
                    listappointment({ "doctorID":staffId }).then((resp) => {
                        doctor= resp.response[0].doctorName;

                    });

                    const options = {
                        method: 'DELETE',
                        uri: 'https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments/' + req.query.id,
                        json: true,
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': process.env.token
                        }
                    }
                    request(options)
                        .then(response1 => {
                            console.log("Inside request");
                            var message = "Your appointment with "+doctor +"has been successfully cancelled."
                            const From = '16466998290'
                            var To = "1" + phone;
                            nexmo.message.sendSms(
                                From, To, message,
                                (err, responseData) => {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        console.log(responseData);
                                    }
                                }
                            );
                            state = false;
                            res.send(true)
                        })
                    break;
                }
            }
            setTimeout(() => {
                if (state) {
                    console.log("into false", state)
                    res.send(false)
                }
            }, 3000);
        });
})

app.get('/listAppointments', function (req, res) {
    console.log("List appointment req.query :", req.query);
    var finalResponse = [];
    var index = 0;
    var ids = [];
    var reason = [];
    var staff = [], datetime, dates = [], time = [], originalDate = [], originalTime = [], patientName = [];
    unirest.get('https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments')
        .headers({ 'Authorization': process.env.token })
        .end(function (response) {
            var r = response.body.value;
            console.log("r", r);
            for (var i = 0; i < r.length; i++) {
                console.log(r[i].invoiceId+"          "+r[i].customerPhone+"        "+r[i].customerEmailAddress)

                if (r[i].customerEmailAddress == req.query.email && r[i].invoiceId == req.query.DOB && r[i].customerPhone == req.query.phone) {
                    staff[i] = r[i].staffMemberIds[0];
                    datetime = r[i].start.dateTime
                    var date1 = datetime.substring(0, 10);
                    console.log("date1", date1);
                    originalDate[i] = date1;
                    let now = new Date(date1);
                    var date1 = date.format(now, 'MM-DD-YYYY HH:mm:ss');
                    var finalDate = date1.substring(0, 10);
                    dates[i] = finalDate;
                    var time1 = datetime.substring(11, 16)
                    console.log("time1", time1);
                    originalTime[i] = time1
                    var finalTime = convertTime(time1);
                    time[i] = finalTime;
                    ids[i] = r[i].id;
                    reason[i] = r[i].serviceName;
                    patientName[i] = r[i].customerName;
                }

            }
            console.log("Staff length", staff.length);
            patientName = patientName.filter(function (element) {
                return element !== undefined;
            });
            originalDate = originalDate.filter(function (element) {
                return element !== undefined;
            });
            originalTime = originalTime.filter(function (element) {
                return element !== undefined;
            });
            staff = staff.filter(function (element) {
                return element !== undefined;
            });
            dates = dates.filter(function (element) {
                return element !== undefined;
            });
            time = time.filter(function (element) {
                return element !== undefined;
            });
            reason = reason.filter(function (element) {
                return element !== undefined;
            });
            ids = ids.filter(function (element) {
                return element !== undefined;
            });
            let patientNameLocal = patientName;
            let reasonLocal = reason;
            let staffLocal = staff;
            let dateLocal = dates;
            let timeLocal = time;
            let idsLocal = ids
            let originalDateLocal = originalDate;
            let originalTimeLocal = originalTime;
            if (staffLocal.length == 0) {
                res.send([]);
            }
            else {
                localFunction = function () {
                    console.log("Calling Local function");
                    console.log(staffLocal);
                    console.log("staffLocal[0]", staffLocal[0]);
                    listappointment({ "doctorID": staffLocal[0] }).then((resp) => {
                        console.log("resp from db", resp);
                        if (resp.response.length == 0) {
                            finalResponse.push([])
                        }
                        else {

                            finalResponse.push({ "patientName": patientNameLocal[0], "oDate": originalDateLocal[0], "oTime": originalTimeLocal[0], "reason": reasonLocal[0], "email": req.query.email, "id": idsLocal[0], "doctorName": resp.response[0].doctorName, "specialization": resp.response[0].specialization, "date": dateLocal[0], "time": timeLocal[0], "address": resp.response[0].address1, "imageURL": resp.response[0].imageURL })
                            staffLocal.splice(0, 1);
                            dateLocal.splice(0, 1);
                            idsLocal.splice(0, 1);
                            timeLocal.splice(0, 1);
                            originalDateLocal.splice(0, 1);
                            originalTimeLocal.splice(0, 1);
                            patientNameLocal.splice(0, 1);
                            console.log("out side staffLocal", staffLocal.length);
                            if (staffLocal.length > 0) {
                                console.log("inside staffLocal", staffLocal.length);
                                localFunction();
                            }
                            else {
                                if (finalResponse.length == null) {
                                    console.log("Empty final response");
                                    res.send([]);

                                }
                                else {
                                    console.log("Inside Else", finalResponse);
                                    res.send(finalResponse);

                                }
                            }
                        }
                    });

                }
                localFunction();
            }
        });
})

app.get('/retrive', function (req, res) {
    console.log("hitted", req.query.zipcode);
    var zipcode = req.query.zipcode;
    zipcode = zipcode.split(' ').join('\\s');
    console.log("hitted", zipcode);
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("healthcarebot");
        query = {
            $or: [
                { 'zipcode': { $regex: zipcode, $options: 'xi' } },
                { 'city': { $regex: zipcode, $options: 'xi' } },
                { 'state': { $regex: zipcode, $options: 'xi' } },
            ]
        };
        dbo.collection("doctors").find(query).toArray(function (err, result) {
            if (err) throw err;
            console.log(result);
            res.send(result)
            db.close();
        });
    });
})
app.post('/insert', function (req, res) {
    console.log(res.body)
    var myObj = {
        description: req.body.description,
        title: req.body.title
    }
    mongo.connect(url, function (err, db) {
        if (err)
            throw err;
        db.collection("MyCollection").insert(myObj, function (err1, result) {
            if (err1) {
                res.json(myObj);
            }
            else {
                res.send("Data inserted Successfully");
            }
            db.close();
        });
    });
});
app.get('/slots', function (req, res) {
    console.log("slots", req.query);
    var state = false;
    var index;
    var timings = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22']
    var slot = [];
    var time;
    time = req.query.slot;
    console.log("req.query.slot", req.query.slot, req.query.date);
     MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("healthcarebot");
        dbo.collection("doctors").find({ 'timings': { $elemMatch: { date: req.query.date } } }).toArray(function (err, result) {
            if (err) throw err;
            if (result.length != 0) {
                for (var i = 0; i < result[0].timings.length; i++) {
                    console.log("result[0].timings[0].date", result[0].timings[i].date)
                    if (req.query.date == result[0].timings[i].date) {
                        slot = result[0].timings[i].slot
                        console.log("slot", slot);
                        for (var j = 0; j < slot.length; j++) {
                            if (time.substring(0, 2) != slot[j]) {
                                state = true;
                            }
                        }
                    }

                }
            }

            for (var i = 0; i < timings.length - 1; i++) {
                for (var j = 0; j < slot.length; j++) {
                    if (timings[i] === slot[j]) {
                        index = i;
                    }
                }
            }
            if (result.length == 0 || state) {
                res.send({ "msg": true })
            }
            else if (index == 0) {
                console.log(timings[index]);
                console.log(timings[index + 1]);
                var h1 = hourConvert.to12Hour(timings[index]);
                var h2 = hourConvert.to12Hour(timings[index + 1]);
                console.log(h1, h2)
                var f1 = h1.hour + ":00  " + (h1.meridiem).toUpperCase()
                var f2 = h2.hour + ":00  " + (h2.meridiem).toUpperCase()
                res.send({ "slot1": f1, "slot2": f2, "msg": false })
            }

            else if (result[0].timings.length == index) {
                console.log(timings[index - 1]);
                console.log(timings[index]);
                var h1 = hourConvert.to12Hour(timings[index - 1]);
                var h2 = hourConvert.to12Hour(timings[index]);
                console.log(h1, h2)
                var f1 = h1.hour + ":00  " + (h1.meridiem).toUpperCase()
                var f2 = h2.hour + ":00  " + (h2.meridiem).toUpperCase()
                res.send({ "slot1": f1, "slot2": f2, "msg": false })
            }

            else {
                console.log(typeof (timings[index - 1]));
                console.log(typeof (timings[index + 1]));
                var h1 = hourConvert.to12Hour(Number(timings[index - 1]));
                var h2 = hourConvert.to12Hour(Number(timings[index + 1]));
                console.log(h1, h2)
                var f1 = h1.hour + ":00  " + (h1.meridiem).toUpperCase()
                var f2 = h2.hour + ":00  " + (h2.meridiem).toUpperCase()

                res.send({ "slot1": f1, "slot2": f2, "msg": false })
            }

            db.close();
        });
    });
});


app.get('/findDoctor', function (req, res) {
    console.log("find Doctor req.query :", req.query);
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("healthcarebot");
        var zipcode = req.query.zipcode;
        zipcode = zipcode.split(' ').join('\\s');
        console.log("req", JSON.stringify(req.query));
        if (req.query.Gender == 'No') {
            var query = {
                $and: [
                    { 'specialization': req.query.specialization },
                    {
                        $or: [
                            { 'zipcode': { $regex: zipcode, $options: 'xi' } },
                            { 'state': { $regex: zipcode, $options: 'xi' } },
                            { 'city': { $regex: zipcode, $options: 'xi' } }
                        ]
                    }
                ]
            };

        } else {
            var query = {
                $and: [
                    { 'gender': req.query.Gender },
                    { 'specialization': req.query.specialization },
                    {
                        $or: [
                            { 'zipcode': { $regex: zipcode, $options: 'xi' } },
                            { 'state': { $regex: zipcode, $options: 'xi' } },
                            { 'city': { $regex: zipcode, $options: 'xi' } }
                        ]
                    }
                ]
            };
        }
        dbo.collection("doctors").find(query).toArray(function (err, result) {
            if (err) throw err;
            console.log(result);
            res.send(result)
            db.close();
        });
    });
});
app.get('/getDoctorDetails', (req, res) => {
    console.log("doctor", req.query.doctor);
    var doctorName = req.query.doctor || 'Dr. Thomas Spier, MD'; 
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("healthcarebot");
        var query = { "name": doctorName };
        dbo.collection("doctors").find(query).toArray(function (err, result) {
            if (err) throw err;
            console.log(result[0].doctorID);
            db.close();
            unirest.get('https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/staffMembers/' + result[0].doctorID)
                .headers({ 'Authorization': process.env.token })
                .end(function (response) {
                    var data = response.body;
                    data.zipcode = result[0].zipcode;
                    data.specialization = result[0].specialization;
                    res.send(data)
                });
        });
    });
});
app.get('/sheduleAppointment', (req, res) => {
    console.log(" shedule Appointment req.query", JSON.stringify(req.query));
    console.log("req.query.doctorName", req.query.doctorName);
    var time = req.query.time;
    var inputJson = {};
    var params = {}
    var t = time.substring(0, 2);
    var ti = Number(t) + 1;
    let now = new Date(req.query.date);
    var date1 = date.format(now, 'MM-DD-YYYY HH:mm:ss');
    var finalDate = date1.substring(0, 10);
    console.log("finalDate", finalDate);
    var time1 = req.query.date + "T" + t + ":00:00.0000000+00:00";
   // 2018-12-10T12:00:00.0000000+00:00
    var endTime = req.query.date + "T" + ti + ":00:00.0000000+00:00"
    console.log("time", time);
    var finalTime = convertTime(time);
    console.log("time1", time1);
    var da = new Date(req.query.date);
    var dat = da.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
    day = dat.substring(0, 3);
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("healthcarebot");
        var query = { "doctorName": req.query.doctorName };
        if (req.query.insuranceProvider == undefined || req.query.insuranceID == undefined || req.query.groupId == undefined) {
            params1 = {
                "doctorName": req.query.doctorName,
                "patientName": req.query.patientName,
                "phone": req.query.phone,
                "description": req.query.description,
                "email": req.query.email,
                "appointment": req.query.date + " " + req.query.time,
                "insuranceProvider": null,
                "insuranceID": null,
                "groupId": null
            }
            console.log('inside if', params1);
            dbo.collection("patients").insert(params1, function (err, data) {
                console.log("success");

            })
        }
        else {
            params = {
                "doctorName": req.query.doctorName,
                "patientName": req.query.patientName,
                "phone": req.query.phone,
                "description": req.query.description,
                "appointment": req.query.date + " " + req.query.time,
                "insuranceProvider": req.query.insuranceProvider,
                "insuranceID": req.query.insuranceID,
                "email": req.query.email,
                "groupId": req.query.groupId
            }
            console.log('inside else params', params);

            dbo.collection("patients").insert(params, function (err, data) {
                console.log("success");

            })
        }
        console.log("doctorName", req.query.doctorName);
        console.log("query", query);
        dbo.collection("doctors").find(query).toArray(function (err, result) {
            console.log("result", result);
            if (err) throw err;
            db.close();
            const options = {
                method: 'POST',
                uri: 'https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments',
                json: true,
                body: {
                    "@odata.type": "#microsoft.graph.bookingAppointment",
                    "customerEmailAddress": req.query.email,
                    "staffMemberIds": [result[0].doctorID],
                    "customerLocation": {
                        "@odata.type": "#microsoft.graph.location",
                        "address": {
                            "@odata.type": "#microsoft.graph.physicalAddress",
                            "city": "Buffalo",
                            "countryOrRegion": "USA",
                            "postalCode": "98052",
                            "postOfficeBox": null,
                            "state": "NY",
                            "street": "123 First Avenue",
                            "type@odata.type": "#microsoft.graph.physicalAddressType",
                            "type": null
                        },

                        "coordinates": null,
                        "displayName": "Customer",
                        "locationEmailAddress": null,
                        "locationType@odata.type": "#microsoft.graph.locationType",
                        "locationType": null,
                        "locationUri": null,
                        "uniqueId": null,
                        "uniqueIdType@odata.type": "#microsoft.graph.locationUniqueIdType",
                        "uniqueIdType": null
                    },
                    "customerName": req.query.patientName,
                    "customerNotes": req.query.description,
                    "customerPhone": req.query.phone,
                    "end": {
                        "@odata.type": "#microsoft.graph.dateTimeTimeZone",
                        "dateTime": endTime,
                        "timeZone": "UTC"
                    },
                    "invoiceAmount": 10.0,
                    "invoiceDate": {
                        "@odata.type": "#microsoft.graph.dateTimeTimeZone",
                        "dateTime": time1,
                        "timeZone": "UTC"
                    },
                    "invoiceId": req.query.DOB,
                    "invoiceStatus@odata.type": "#microsoft.graph.bookingInvoiceStatus",
                    "invoiceStatus": "open",
                    "invoiceUrl": "theInvoiceUrl",
                    "optOutOfCustomerEmail": false,
                    "postBuffer": "PT10M",
                    "preBuffer": "PT5M",
                    "price": 10.0,
                    "priceType@odata.type": "#microsoft.graph.bookingPriceType",
                    "priceType": "fixedPrice",
                    "reminders@odata.type": "#Collection(microsoft.graph.bookingReminder)",
                    "reminders": [
                        {
                            "@odata.type": "#microsoft.graph.bookingReminder",
                            "message": "This service is tomorrow",
                            "offset": "P1D",
                            "recipients@odata.type": "#microsoft.graph.bookingReminderRecipients",
                            "recipients": "allAttendees"
                        },
                        {
                            "@odata.type": "#microsoft.graph.bookingReminder",
                            "message": "Please be available to enjoy your lunch service.",
                            "offset": "PT1H",
                            "recipients@odata.type": "#microsoft.graph.bookingReminderRecipients",
                            "recipients": "customer"
                        },
                        {
                            "@odata.type": "#microsoft.graph.bookingReminder",
                            "message": "Please check traffic for next cater.",
                            "offset": "PT2H",
                            "recipients@odata.type": "#microsoft.graph.bookingReminderRecipients",
                            "recipients": "staff"
                        }
                    ],
                    "serviceId": "57da6774-a087-4d69-b0e6-6fb82c339976",
                    "serviceLocation": {
                        "@odata.type": "#microsoft.graph.location",
                        "address": {
                            "@odata.type": "#microsoft.graph.physicalAddress",
                            "city": "Buffalo",
                            "countryOrRegion": "USA",
                            "postalCode": "98052",
                            "postOfficeBox": null,
                            "state": "NY",
                            "street": "123 First Avenue",
                            "type@odata.type": "#microsoft.graph.physicalAddressType",
                            "type": null
                        },
                        "coordinates": null,
                        "displayName": "Customer location",
                        "locationEmailAddress": null,
                        "locationType@odata.type": "#microsoft.graph.locationType",
                        "locationType": null,
                        "locationUri": null,
                        "uniqueId": null,
                        "uniqueIdType@odata.type": "#microsoft.graph.locationUniqueIdType",
                        "uniqueIdType": null
                    },
                    "serviceName": req.query.description,
                    "serviceNotes": "Customer requires punctual service.",
                    "start": {
                        "@odata.type": "#microsoft.graph.dateTimeTimeZone",
                        "dateTime": time1,
                        "timeZone": "UTC"
                    }
                },
                headers: {
                    'Accept': 'application/json',
                    'Authorization': process.env.token
                }
            }
            var message = 'Hello, ' + req.query.patientName + '  Your appointment has been successfully scheduled with ' + result[0].doctorName + ' on ' + finalDate + ' at ' + finalTime + '.'
            request(options)
                .then(response => {
                    console.log(response);
                    console.log("Before response");
                    const From = '16466998290'
                    var To = "1" + req.query.phone;
                    nexmo.message.sendSms(
                        From, To, message,
                        (err, responseData) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.dir(responseData);
                            }
                        }
                    );
                    res.send({ "finalTime": finalTime, "date": finalDate, "status": true, "imgURL": result[0].imageURL, "specialization": result[0].specialization, "address": result[0].address1 })
                })
        });
    });
});
app.listen(process.env.PORT || 4000, function () {
    console.log("Running port 4000");
});
app.use(function (req, res, next) {
    res.status(404).send("Sorry can't find that!")
})
app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

