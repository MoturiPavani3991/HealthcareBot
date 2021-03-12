var env = require('node-env-file');
env(__dirname + '/.env');
var unirest = require('unirest');
module.exports = (params) => {

return new Promise(function (resolve, reject) {
unirest.get('https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments')
.headers({ 'Authorization': process.env.token })
.end(function (response) {
     r = response.body.value;
    for (var i = 0; i < r.length; i++) {
     var x = r[i].customerEmailAddress;
        var y = params.email;
        console.log(x, y);
        if (x == y) {
            id = r[i].id
            console.log("id", id);
            const options = {
                method: 'DELETE',
                uri: 'https://graph.microsoft.com/beta/bookingBusinesses/Healthcare@greatcode.onmicrosoft.com/appointments/' + id,
                json: true,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': process.env.token
                }
            }
            request(options)
                .then(response1 => {
                    console.log("Inside request");
                   resolve({state:true})
                   // res.send(true)
                })
                
            break;
        }
    }
   

  
});
})

}

