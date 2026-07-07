const path = require('path')

module.exports = {
    publicPath: '/',  // Zeabur 部署使用根目录
    outputDir: 'dist',
    assetsDir: 'assets',
    productionSourceMap: false,  // 生产环境不生成 source map，减小体积
    transpileDependencies: [
        'element-plus',
        '@element-plus',
        '@ctrl/tinycolor',
        '@popperjs',
        'primevue',
        '@primevue',
        '@primeuix'
    ],
    // webpack 4 把 .mjs 当严格 ESM 处理，PrimeVue 的 .mjs 里混用了 .vue 导入，
    // 需要降级为 javascript/auto 才能正常打包
    chainWebpack: config => {
        config.module
            .rule('mjs')
            .test(/\.mjs$/)
            .include.add(/node_modules/).end()
            .type('javascript/auto')

        // webpack 4 不支持 package.json 的 exports 子路径映射，
        // @primeuix 系列包的子路径引用需要手动映射到 dist 目录
        config.resolve.alias
            .set('@primeuix/themes', path.resolve(__dirname, 'node_modules/@primeuix/themes/dist'))
            .set('@primeuix/styles', path.resolve(__dirname, 'node_modules/@primeuix/styles/dist'))
            .set('@primeuix/utils', path.resolve(__dirname, 'node_modules/@primeuix/utils/dist'))
    }
}
