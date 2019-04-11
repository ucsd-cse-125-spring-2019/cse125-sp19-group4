/**
 * @param  {string} filename
 * 
 * Read all string from text file return it
 * using sync XHR
 */
let readStringFrom = (filename) => {
    let request = new XMLHttpRequest();
    request.open('GET', filename, false);
    request.send(null);
    
    return request.responseText;
}

export default readStringFrom