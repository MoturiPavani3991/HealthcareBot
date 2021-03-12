// var schedule = require('node-schedule');
// var date = new Date(2019, 00, 08, 11, 22, 0);
//  console.log("sample")
// var j = schedule.scheduleJob(date, function(){
//   console.log('The world is going to end today.');
// });
// j
//console.log(j);
var schedule = require('node-schedule');
var date = new Date(2019, 00, 08, 11, 25, 0);
var x = 'Tada!';
var j = schedule.scheduleJob(date, function(y){
  console.log(y);
}.bind(null,x));
x = 'Changing Data';