items = {
    'boots': {
        count: 0,
        description: "each boot you have will increase your speed by 1",
        model: 'boots',
        enhance(buff) {
            buff.STATUS_speed += 1;
        },
    },
    'swords': {
        count: 0,
        description: "each sword you have will increase your attack by 1",
        enhance(buff) {
            buff.STATUS_damage += 1;
        },
    },
    'shields': {
        count: 0,
        description: "each shield you have will increase your defence by 1",
        enhance(buff) {
            buff.STATUS_defense += 1;
        },
    },
    'hearts': {
        count: 0,
        description: "each heart you have will increase your health by 10",
        enhance(buff) {
            buff.STATUS_maxHealth += 10;
        },
    },
}

module.exports = items;