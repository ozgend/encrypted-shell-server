var qs = require('querystring');
var bodyParser = require('body-parser');
var express = require('express');
var exec = require('child_process').exec;
var app = new express();
var cors = require('cors');
var crypto = require('crypto');
var fs = require('fs');

app.set('port', (process.env.PORT || 5200));
app.disable('etag');
app.disable('x-powered-by');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(requestInterceptor);

app.post('/command', function (req, res) {
    var command = req.body.command;
    executeShell(command, function (result) {
        res.status(200).send(result);
    });
});

app.use('/echo', function (req, res) {
    console.log('-- echo', req.body);
    res.status(200).send(req.body);
});

app.use('/', function (req, res) {
    res.sendStatus(200);
});

app.listen(app.get('port'), function () {
    console.log('++ server is running on port', app.get('port'));
});

function executeShell(command, callback) {
    exec(command, function (error, stdOut, stdError) {
        var result = { stdOut, stdError, command };
        result.cwd = process.cwd();
        callback(result);
    });
};

function requestInterceptor(req, res, next) {
    console.info('-- interceptor 1 -> ', req.path, req.body);

    var decryptedRequestObject = decrypt(req.body.data, './keys/test_private.pem');
    req.body = decryptedRequestObject;

    console.info('-- interceptor 2 -> ', req.body);

    next();
}

function encrypt(data, publicKeyPath) {
    var publicKeyString = fs.readFileSync(publicKeyPath, 'utf-8');
    var raw = JSON.stringify(data);
    var buffer = new Buffer(raw);
    var encrypted = crypto.publicEncrypt(publicKeyString, buffer);
    return encrypted.toString("base64");
};

function decrypt(data, privateKeyPath) {
    var privateKeyString = fs.readFileSync(privateKeyPath, 'utf-8');
    var privateKey = { key: privateKeyString, padding: crypto.constants.RSA_PKCS1_PADDING };
    var buffer = new Buffer(data, "base64");
    var decrypted = crypto.privateDecrypt(privateKey, buffer);
    var raw = decrypted.toString("utf8");
    return JSON.parse(raw);
};