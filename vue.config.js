module.exports = {
    publicPath: process.env.NODE_ENV === 'production'
        ? '/Neon/'  // GitHub Pages 仓库名，根据实际情况修改
        : '/',
    outputDir: 'dist',
    assetsDir: 'assets',
    productionSourceMap: false  // 生产环境不生成 source map，减小体积
}
