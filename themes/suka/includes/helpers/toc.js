/**
  * 修复版 toc() 帮助函数
  *
  * 内置 toc() 在标题层级“先高后低”时（如文章以 ## 开头、后文出现 #）会提前闭合
  * 根 <ol>，后续 <li> 溢出到容器外，目录被渲染到文章开头。
  * 这里先用栈把扁平标题序列组装成层级树，再递归渲染，
  * 任意标题层级序列都能生成合法的 <ol>/<li> 嵌套。
  * 选项与内置实现保持一致（min_depth、max_depth、max_items、class 系列与 list_number）。
  *
  * @example
  *     <%- toc(page.content, { class: 'post-toc', list_number: false }) %>
  */

const { tocObj, escapeHTML, encodeURL } = require('hexo-util');

module.exports = function (hexo) {
    hexo.extend.helper.register('toc', function (str, options = {}) {
        options = Object.assign({
            min_depth: 1,
            max_depth: 6,
            max_items: Infinity,
            class: 'toc',
            class_item: '',
            class_link: '',
            class_text: '',
            class_child: '',
            class_number: '',
            class_level: '',
            list_number: true
        }, options);

        // 标题中的 KaTeX 公式渲染为两份内容：katex-mathml（屏幕阅读器用，
        // 内含 LaTeX 源码 annotation）与 katex-html（视觉渲染）。tocObj 按纯文本
        // 提取标题文字时会两份叠加，公式在目录里显示成原始代码，这里先去掉前者
        str = String(str).replace(/<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g, '');

        let data = tocObj(str, { min_depth: options.min_depth, max_depth: options.max_depth });
        // KaTeX 视觉渲染的 vlist 里带有零宽空格，一并清理
        data = data.map(item => ({ ...item, text: item.text.replace(/\u200b/g, '') }));
        if (!data.length) return '';

        // 与内置行为一致：超过 max_items 时先自底向上裁掉最深层，再截断条数
        if (options.max_items >= 1 && options.max_items !== Infinity && data.length > options.max_items) {
            const levels = data.map(item => item.level);
            const min = Math.min(...levels);
            const max = Math.max(...levels);
            for (let currentLevel = max; data.length > options.max_items && currentLevel > min; currentLevel--) {
                data = data.filter(item => item.level < currentLevel);
            }
            data = data.slice(0, options.max_items);
        }

        const className = escapeHTML(options.class);
        const itemClassName = escapeHTML(options.class_item || options.class + '-item');
        const linkClassName = escapeHTML(options.class_link || options.class + '-link');
        const textClassName = escapeHTML(options.class_text || options.class + '-text');
        const childClassName = escapeHTML(options.class_child || options.class + '-child');
        const numberClassName = escapeHTML(options.class_number || options.class + '-number');
        const levelClassName = escapeHTML(options.class_level || options.class + '-level');
        const listNumber = options.list_number;

        // 以第一个标题的层级作为目录顶层，其后比它更高的标题按同级处理
        const baseLevel = data[0].level;
        const lastNumber = [0, 0, 0, 0, 0, 0];

        const renderItem = (el, level) => {
            if (!el.unnumbered) lastNumber[level - 1]++;
            for (let i = level; i <= 5; i++) lastNumber[i] = 0;

            const href = el.id ? `#${encodeURL(el.id)}` : null;
            let html = `<li class="${itemClassName} ${levelClassName}-${level}">`;
            html += href ? `<a class="${linkClassName}" href="${href}">` : `<a class="${linkClassName}">`;
            if (listNumber && !el.unnumbered) {
                html += `<span class="${numberClassName}">`;
                for (let i = baseLevel - 1; i < level; i++) html += `${lastNumber[i]}.`;
                html += '</span> ';
            }
            html += `<span class="${textClassName}">${el.text}</span></a>`;
            return html;
        };

        // 栈构建层级树：弹出不比当前标题深的层级，剩余栈顶即为父节点
        const stack = [];
        const roots = [];
        for (const el of data) {
            const level = Math.max(el.level, baseLevel);
            const node = { el, level, children: [] };
            while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
            (stack.length ? stack[stack.length - 1].children : roots).push(node);
            stack.push(node);
        }

        const renderList = (nodes, isRoot) => {
            let html = isRoot ? `<ol class="${className}">` : `<ol class="${childClassName}">`;
            for (const node of nodes) {
                html += renderItem(node.el, node.level);
                if (node.children.length) html += renderList(node.children, false);
                html += '</li>';
            }
            return html + '</ol>';
        };

        return renderList(roots, true);
    });
};
