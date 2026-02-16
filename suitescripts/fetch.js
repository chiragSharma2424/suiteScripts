function sendingGetRequestToNetsuiteUrl() {
    fetch('https://8132412-sb1.app.netsuite.com/app/site/hosting/restlet.nl?script=4220&deploy=1', {
        method: "GET"
    }).then((resp) => {
        return resp.json();
    }).then((data) => {
        console.log(data)
    }).catch((err) => {
        console.log(`error in sending request ${err}`)
    })
}

sendingGetRequestToNetsuiteUrl();