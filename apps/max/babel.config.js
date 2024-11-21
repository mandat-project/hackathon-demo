module.exports = {
    extends: '../../babel.base-config.js',
    presets: [
        ['@babel/preset-env', {targets: {node: 'current'}}],
        '@babel/preset-typescript',
    ],
}
