const io = require('socket.io-client');

const socket = io.connect('http://127.0.0.1:8080/');
socket.on('connect', function(){
    console.log("Client connects to server");
    class TestObj{
        constructor(name) {
            this.name = name;
        }
    }
    class Data {
        constructor(number, string, array, myObj) {
            this.number = number;
            this.string = string;
            this.array = array;
            this.myObj = myObj;
        }
    }
    let testObj = new TestObj('Test');
    // JavaScript numbers are always stored as double precision floating point numbers
    let array = new Array(10.12, 20.5, 30.6, 40.12, 50);
    let data = new Data(1.00, 'data', array, testObj);
    socket.emit('client to server', data);
});

socket.on('broadcast', function(obj) {
    console.log('msg from server: ' + obj.number);
    console.log('msg from server: ' + obj.string);
    console.log('msg from server: ' + obj.array);
    console.log('msg from server: ' + obj.myObj.name);
});

socket.on('disconnect', function(){
    console.log("client diconnects from server");
});