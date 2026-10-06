/* global hexo */

// Welcome Message
require('../includes/tasks/welcome');
// Check Hexo Version
require('../includes/tasks/check_hexo')(hexo);
// Check required dependencies
require('../includes/tasks/check_deps');

const logger = require('hexo-log').default();
logger.info('Loading Suka Theme Plugins');

// Helper
require('../includes/helpers/page')(hexo);
require('../includes/helpers/tags')(hexo);
require('../includes/helpers/favicon')(hexo);
require('../includes/helpers/qrcode')(hexo);
// 覆盖内置 toc()：修复标题层级先高后低时目录 <ol> 提前闭合、溢出到文章开头的问题
require('../includes/helpers/toc')(hexo);

// Generator
require('../includes/generator/search')(hexo);

// Filter
require('../includes/filter/prism')(hexo);

// Debug helper
hexo.extend.helper.register('console', function () {
    console.log(arguments);
});

if ((/3.[89]/).test(hexo.version)) {
    hexo.extend.filter.unregister('after_render:html', require('../../../node_modules/hexo/lib/plugins/filter/meta_generator'));
}