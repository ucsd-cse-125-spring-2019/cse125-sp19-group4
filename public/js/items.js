items = {
    'boots': {
        count: 0,
        description: "each boot you have will increase your speed by 1",
        enhance(buff) {
            buff.STATUS_speed += 1;
        },
    }
}

module.exports = items;