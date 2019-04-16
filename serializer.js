const EventType = {
    PLAYER_MOVE: "PLAYER_MOVE",
    GAME_UPDATE: "GAME_UPDATE"
}

class Event {
    constructor(type, args) {
        this.type = type;
        this.args = args;
    }
}

if (!String.format) {
  String.format = function(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number] 
        : match
      ;
    });
  };
}

function objToString(obj) {
    switch (typeof obj) {
        case "string":
            return '"' + obj + '"'
            break;

        case "function":
            return obj.toString();

        case "number":
            return obj.toString();

        case "object":
            let keys = Object.keys(obj)
            let result = "{"
            for (let i = 0; i < keys.length; i++) {
                result += String.format('"{0}":{1},', keys[i], objToString(obj[keys[i]]));
            }
            if (keys.length > 0) {
                result = result.substring(0, result.length - 1)
            }
            result += "}"
            return result
            break;
    }
}

function stringToObj(astring) {
    let obj = {}
    let index1 = 0, index2 = 0;
    while (true) {
        index1 = astring.indexOf('"',index1)
        if (index1 == -1) {
            break
        }
        index2 = astring.indexOf('"',index1+1)

        if (astring.charAt(index2 + 2) == '{') {
            let index3 = findCloseBracket(astring, index2 + 3)
            obj[astring.substring(index1+1, index2)] = stringToObj(astring.substring(index2 + 2, index3 + 1))
            index1 = index3 + 1
        }
        else if (astring.charAt(index2 + 2) == 'f') {
            let index3 = astring.indexOf('{', index2)
            let index4 = findCloseBracket(astring, index3 + 1)
            obj[astring.substring(index1+1, index2)] = new Function("return " + astring.substring(index2 + 2, index4 + 1))()
            index1 = index4 + 1
        }
        else if (astring.charAt(index2 + 2) == '"') {
            let index3 = findDoubleQuote(astring, index2 + 3)
            obj[astring.substring(index1+1, index2)] = astring.substring(index2 + 3, index3)
            index1 = index3 + 1
        }
        else {
            let index3 = findComma(astring, index2 + 3)
            obj[astring.substring(index1+1, index2)] = Number(astring.substring(index2 + 2, index3))
            index1 = index3 + 1
        }

    }
    return obj
}

function findCloseBracket(astring, index) {
    let i = 1;
    while (i != 0) {
        if (astring.charAt(index) == '{') {
            i++;
        } 
        if (astring.charAt(index) == '}') {
            i--;
        }
        index++;
    }
    return index - 1;
}

function findDoubleQuote(astring, index) {
    while (true) {
        if (astring.charAt(index) == '"') {
            return index;
        } 
        index++;
    }
}

function findComma(astring, index) {
    while (true) {
        if (astring.charAt(index) == ',') {
            return index;
        } 
        if (astring.charAt(index) == ' ') {
            return index;
        }
        index++;
    }
}

class Serializer{
    static serialize(object) {
        return objToString(object)
    }

    static deserialize(astring) {
        return stringToObj(astring)
    }
}