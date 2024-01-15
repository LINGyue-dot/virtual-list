虚拟列表
1. 基本实现原理，是通过 scrollTop 来获取可视区域的 index 
2. 他是通过计算第一个 item 的 index ，给父组件进行一个 transformY ，同时显示的 item 数量在头尾各多一个用以实现动画（暂时还不清楚如何实现）
3. 避免白屏
   1. 快速滚动的白屏，很多的做法是拦截 onScroll 事件，但是 onScroll 事件是在 scroll 之后才触发的，所以拦截 onScroll 前置事件 onWheel ，等渲染结束之后再进行滚动（不太对、目前仍然是先 scrollTop 再计算出需要渲染的 List 接着渲染）
   2. 拖拽滚动条白屏：做一个假的滚动条，控制权在自己手上


问题：
1. 动态高度 item 时候如何计算高度对应的 index 呢？
2. 假滚动条如何实现，存在 CSS 问题吗？（能让用户自定义 CSS 样式吗）
3. onScroll 事件在 onWheel 之后，那完整的触发顺序是什么？



https://zhuanlan.zhihu.com/p/237996796

# basic

1. wheel 事件时候会触发 `syncScrollTop` 最终修改 holder.scrollTop = xxx 实现滚动，同时触发 rerender
2. rerender 时候会触发 useChildren 的 ref 函数，调用的是 `useHeight` 的 `setInstanceRef`
   1. 其中会触发 `doCollection`/`collectHeights` 通过获取需要渲染 list item 的 offsetHeight 缓存下来，一并重新计算整个容器的高度
   2. 同时 useLayoutEffect 时候重新计算 start end 的 index ，得到需要重新渲染的 min list


# dynamic
和 basic 一样的逻辑，本质上需要用户给出一个估计 itemHeight ，最后利用 offsetHeight 的计算 cache 计算出 startIndex