function stringifyReplacer(key, value) {
    if (typeof value === "number") { // limit float data type to have only 4 decimal places
        return parseFloat((value).toFixed(4));
    }

    // if item is array, round each element of the array to 4 decimal places
    if (Array.isArray(value)) { 
        arr = []
        value.forEach(function(item) {
            if (typeof value === "number") {
                arr.push(parseFloat(item.toFixed(4)));
            } else {
                arr.push(item)
            }
        })
        return arr
    }

    // if (key.startsWith('Tree')) {
    //     return undefined;
    // }

    return value
}

// Use this function as the toJSON function of the object you want to filter. The object must has
// a KEYS property which is an array that contains the keys of all the properties you want to keep
// of the object.
function PropertiesFilter() {
    if (!('KEYS' in this)) {
        return this;
    }

    let obj = {}
    for (let i in this.KEYS) {
        let key = this.KEYS[i];
        obj[key] = this[key];
    }
    return obj;
}


// recursively add paropertiesfilter to all sub objects
function recursiveSetPropertiesFilter(obj) {
    for (let key in obj) {
        if (typeof obj[key] == 'object') {
            recursiveSetPropertiesFilter(obj[key]);
        }
    }
    obj.toJSON = PropertiesFilter;
}

exports.PropertiesFilter = PropertiesFilter;
exports.recursiveSetPropertiesFilter = recursiveSetPropertiesFilter;
exports.stringifyReplacer = stringifyReplacer;