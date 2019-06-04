const fs = require('fs');
const ini = require('ini');
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))

items = {
    'boots': {
        count: 0,
        prob: Number(config.item.boots.prob),
        description: "Increase move speed by 1",
        enhance(buff, status) {
            buff.speed += 1;
            status.speed += 1;
        },
    },
    'swords': {
        count: 0,
        prob: Number(config.item.swords.prob),
        description: "Increase attack damage by 1",
        enhance(buff, status) {
            buff.damage += 1;
            status.damage += 1;
        },
    },
    'shields': {
        count: 0,
        prob: Number(config.item.shields.prob),
        description: "Increase armor by 1",
        enhance(buff, status) {
            buff.defense += 1;
            status.defense += 1;
        },
    },
    'hearts': {
        count: 0,
        prob: Number(config.item.hearts.prob),
        description: "Increase max health by 10",
        enhance(buff, status) {
            status.maxHealth += 10;
            status.curHealth += 10;
        },
    },
    'daggers': {
        count: 0,
        prob: Number(config.item.daggers.prob),
        description: "Increase attack speed by 10%",
        enhance(buff, status) {
            buff.attackSpeed += 0.1;
            status.attackSpeed += 0.1;
            status.attackInterval = Math.ceil(60 / status.attackSpeed);;
        },
    },
}

module.exports = items;