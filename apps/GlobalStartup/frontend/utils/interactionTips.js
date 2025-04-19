const tips = [
    '分享快乐，传递正能量',
    '每个创作者都在用心创作',
    '欣赏他人，提升自己',
    '点赞是对创作的认可'
];

function getRandomTip() {
    const index = Math.floor(Math.random() * tips.length);
    return tips[index];
}

module.exports = {
    getRandomTip
};