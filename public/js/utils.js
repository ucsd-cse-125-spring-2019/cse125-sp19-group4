function stringifyReplacer(key, value) {
    if (typeof value === "number") { // limit float data type to have only 4 decimal places
        return parseFloat((value).toFixed(4));
    }
}

// Use this function as the toJSON function of the object you want to filter. The object must has
// a KEYS property which is an array that contains the keys of all the properties you want to keep
// of the object.
function PropertiesFilter() {
    let obj = {}
    for (let i in this.KEYS) {
        let key = this.KEYS[i];
        obj[key] = this[key];
    }
    return obj;
}

exports.PropertiesFilter = PropertiesFilter;